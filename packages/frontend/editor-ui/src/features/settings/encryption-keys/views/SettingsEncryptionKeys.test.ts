import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import SettingsEncryptionKeys from './SettingsEncryptionKeys.vue';
import { useEncryptionKeysStore } from '../encryption-keys.store';
import type { EncryptionKey } from '../encryption-keys.types';

vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: () => ({ copy: vi.fn() }),
}));

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

describe('SettingsEncryptionKeys', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('renders a row for each encryption key with a masked id', async () => {
		const store = mockedStore(useEncryptionKeysStore);
		store.keys = [
			makeKey(),
			makeKey({
				id: '74f6c1e9b4d8a2f51234',
				status: 'inactive',
				createdAt: '2026-03-15T10:00:00.000Z',
			}),
		];
		store.visibleKeys = store.keys;
		store.fetchKeys.mockResolvedValue(undefined);

		renderComponent(SettingsEncryptionKeys);

		await waitFor(() => {
			expect(screen.getByText(/4d51.{0,20}0863/)).toBeInTheDocument();
			expect(screen.getByText(/74f6.{0,20}1234/)).toBeInTheDocument();
		});
	});

	it('shows active and inactive status badges', async () => {
		const store = mockedStore(useEncryptionKeysStore);
		store.keys = [
			makeKey({ status: 'active' }),
			makeKey({
				id: '74f6c1e9b4d8a2f51234',
				status: 'inactive',
				createdAt: '2026-03-15T10:00:00.000Z',
			}),
		];
		store.visibleKeys = store.keys;
		store.fetchKeys.mockResolvedValue(undefined);

		renderComponent(SettingsEncryptionKeys);

		await waitFor(() => {
			expect(screen.getByText('Active')).toBeInTheDocument();
			expect(screen.getByText('Inactive')).toBeInTheDocument();
		});
	});

	it('rotates the key after confirmation and reports success', async () => {
		const store = mockedStore(useEncryptionKeysStore);
		store.keys = [makeKey()];
		store.visibleKeys = store.keys;
		store.fetchKeys.mockResolvedValue(undefined);
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
		const store = mockedStore(useEncryptionKeysStore);
		store.keys = [makeKey()];
		store.visibleKeys = store.keys;
		store.fetchKeys.mockResolvedValue(undefined);
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
		const seedKeys = () => {
			const store = mockedStore(useEncryptionKeysStore);
			store.keys = [makeKey()];
			store.visibleKeys = store.keys;
			store.fetchKeys.mockResolvedValue(undefined);
			return store;
		};

		const openPopover = async () => {
			const trigger = await screen.findByRole('button', { name: 'Filter' });
			await fireEvent.click(trigger);
		};

		it('hides the Clear button when no filter is active', async () => {
			seedKeys();
			renderComponent(SettingsEncryptionKeys);

			await openPopover();

			expect(await screen.findByRole('button', { name: 'Apply' })).toBeVisible();
			expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
		});

		it('shows the Clear button when a filter is active', async () => {
			const store = seedKeys();
			store.filters = { activatedFrom: '2025-06-01', activatedTo: '2025-12-15' };
			renderComponent(SettingsEncryptionKeys);

			await openPopover();

			expect(await screen.findByRole('button', { name: 'Apply' })).toBeVisible();
			expect(screen.getByRole('button', { name: 'Clear' })).toBeVisible();
		});

		it('commits the seeded filter to the store when Apply is clicked', async () => {
			const store = seedKeys();
			store.filters = { activatedFrom: '2025-06-01', activatedTo: '2025-12-15' };
			renderComponent(SettingsEncryptionKeys);

			await openPopover();
			await fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));

			expect(store.setFilters).toHaveBeenCalledWith({
				activatedFrom: '2025-06-01',
				activatedTo: '2025-12-15',
			});
		});

		it('resets the store and closes the popover when Clear is clicked', async () => {
			const store = seedKeys();
			store.filters = { activatedFrom: '2025-06-01', activatedTo: '2025-12-15' };
			renderComponent(SettingsEncryptionKeys);

			await openPopover();
			await fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));

			expect(store.resetFilters).toHaveBeenCalledTimes(1);
			await waitFor(() => {
				expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
			});
		});

		it('does not commit changes when the popover is dismissed without Apply', async () => {
			const store = seedKeys();
			renderComponent(SettingsEncryptionKeys);

			await openPopover();
			await fireEvent.keyDown(document.body, { key: 'Escape' });

			expect(store.setFilters).not.toHaveBeenCalled();
		});

		it('re-seeds the draft from the store on every open', async () => {
			const store = seedKeys();
			store.filters = { activatedFrom: '2025-06-01', activatedTo: null };
			renderComponent(SettingsEncryptionKeys);

			// First open + Apply commits the seeded value.
			await openPopover();
			await fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
			expect(store.setFilters).toHaveBeenLastCalledWith({
				activatedFrom: '2025-06-01',
				activatedTo: null,
			});

			// Mutate the store as if another code path changed the filter.
			store.filters = { activatedFrom: '2025-12-15', activatedTo: null };

			// Re-open + Apply must commit the NEW seeded value, proving re-seed.
			await openPopover();
			await fireEvent.click(await screen.findByRole('button', { name: 'Apply' }));
			expect(store.setFilters).toHaveBeenLastCalledWith({
				activatedFrom: '2025-12-15',
				activatedTo: null,
			});
		});
	});
});
