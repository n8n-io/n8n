import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import SettingsEncryptionKeys from './SettingsEncryptionKeys.vue';
import { useEncryptionKeysStore } from '../encryption-keys.store';
import type { EncryptionKey } from '../encryption-keys.types';

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const makeKey = (overrides: Partial<EncryptionKey> = {}): EncryptionKey => ({
	id: '4d51a27b8f03a6d20863',
	type: 'data_encryption',
	algorithm: 'aes-256-gcm',
	status: 'active',
	createdAt: '2026-04-21T10:00:00.000Z',
	updatedAt: '2026-04-21T10:00:00.000Z',
	...overrides,
});

const seedStore = (overrides: Partial<{ items: EncryptionKey[]; totalCount: number }> = {}) => {
	const store = mockedStore(useEncryptionKeysStore);
	store.items = overrides.items ?? [makeKey()];
	store.totalCount = overrides.totalCount ?? store.items.length;
	store.fetchKeys.mockResolvedValue(undefined);
	return store;
};

describe('SettingsEncryptionKeys', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('calls fetchKeys on mount', async () => {
		const store = seedStore();
		renderComponent(SettingsEncryptionKeys);

		await waitFor(() => {
			expect(store.fetchKeys).toHaveBeenCalledTimes(1);
		});
	});

	it('renders a row for each item with a masked id', async () => {
		seedStore({
			items: [
				makeKey(),
				makeKey({
					id: '74f6c1e9b4d8a2f51234',
					status: 'inactive',
					createdAt: '2026-03-15T10:00:00.000Z',
				}),
			],
			totalCount: 2,
		});

		renderComponent(SettingsEncryptionKeys);

		await waitFor(() => {
			expect(screen.getByText(/4d51.{0,20}0863/)).toBeInTheDocument();
			expect(screen.getByText(/74f6.{0,20}1234/)).toBeInTheDocument();
		});
	});

	it('shows active and inactive status indicators', async () => {
		seedStore({
			items: [
				makeKey({ status: 'active' }),
				makeKey({
					id: '74f6c1e9b4d8a2f51234',
					status: 'inactive',
					createdAt: '2026-03-15T10:00:00.000Z',
				}),
			],
			totalCount: 2,
		});

		renderComponent(SettingsEncryptionKeys);

		await waitFor(() => {
			expect(screen.getByText('Active')).toBeInTheDocument();
			expect(screen.getByText('Inactive')).toBeInTheDocument();
		});
	});

	it('rotates the key after confirmation and reports success', async () => {
		const store = seedStore();
		store.rotateKey.mockResolvedValue(undefined);

		renderComponent(SettingsEncryptionKeys);

		const rotateButtons = await screen.findAllByRole('button', { name: /Rotate key/i });
		await fireEvent.click(rotateButtons[0]);

		const confirmButtons = await screen.findAllByRole('button', { name: /Rotate key/i });
		const dialogConfirm = confirmButtons[confirmButtons.length - 1];
		await fireEvent.click(dialogConfirm);

		await waitFor(() => {
			expect(store.rotateKey).toHaveBeenCalledTimes(1);
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	it('surfaces rotate errors via showError', async () => {
		const store = seedStore();
		const error = new Error('rotate failed');
		store.rotateKey.mockRejectedValue(error);

		renderComponent(SettingsEncryptionKeys);

		const rotateButtons = await screen.findAllByRole('button', { name: /Rotate key/i });
		await fireEvent.click(rotateButtons[0]);

		const confirmButtons = await screen.findAllByRole('button', { name: /Rotate key/i });
		const dialogConfirm = confirmButtons[confirmButtons.length - 1];
		await fireEvent.click(dialogConfirm);

		await waitFor(() => {
			expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		});
	});

	describe('filter popover', () => {
		const openPopover = async () => {
			const trigger = await screen.findByRole('button', { name: 'Filter' });
			await fireEvent.click(trigger);
		};

		it('hides the Clear button when no filter is active', async () => {
			seedStore();
			renderComponent(SettingsEncryptionKeys);

			await openPopover();

			expect(await screen.findByRole('button', { name: 'Apply' })).toBeVisible();
			expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
		});

		it('shows the Clear button when a filter is active', async () => {
			const store = seedStore();
			store.filters = {
				activatedFrom: '2025-06-01T00:00:00.000Z',
				activatedTo: '2025-12-15T23:59:59.999Z',
			};
			renderComponent(SettingsEncryptionKeys);

			await openPopover();

			expect(await screen.findByRole('button', { name: 'Apply' })).toBeVisible();
			expect(screen.getByRole('button', { name: 'Clear' })).toBeVisible();
		});

		it('converts the seeded local-day picker values to ISO instants and refetches', async () => {
			const store = seedStore();
			store.filters = {
				activatedFrom: '2025-06-01T00:00:00.000Z',
				activatedTo: '2025-12-15T00:00:00.000Z',
			};
			renderComponent(SettingsEncryptionKeys);

			await openPopover();
			await fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));

			expect(store.setFilters).toHaveBeenCalledTimes(1);
			const arg = store.setFilters.mock.calls[0][0];
			expect(typeof arg.activatedFrom).toBe('string');
			expect(typeof arg.activatedTo).toBe('string');
			expect(arg.activatedFrom).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(arg.activatedTo).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(store.fetchKeys).toHaveBeenCalled();
		});

		it('resets the store and refetches when Clear is clicked', async () => {
			const store = seedStore();
			store.filters = {
				activatedFrom: '2025-06-01T00:00:00.000Z',
				activatedTo: '2025-12-15T23:59:59.999Z',
			};
			renderComponent(SettingsEncryptionKeys);

			await openPopover();
			await fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));

			expect(store.resetFilters).toHaveBeenCalledTimes(1);
			expect(store.fetchKeys).toHaveBeenCalled();
		});

		it('does not commit changes when the popover is dismissed without Apply', async () => {
			const store = seedStore();
			renderComponent(SettingsEncryptionKeys);

			await openPopover();
			await fireEvent.keyDown(document.body, { key: 'Escape' });

			expect(store.setFilters).not.toHaveBeenCalled();
		});
	});
});
