import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionConnection, PromotionProviderSummary } from '../promotionsSettings.api';
import PromotionConnectionForm from './PromotionConnectionForm.vue';

const api = vi.hoisted(() => ({
	createPromotionConnection: vi.fn<typeof PromotionsApi.createPromotionConnection>(),
	clonePromotionCheckout: vi.fn<typeof PromotionsApi.clonePromotionCheckout>(),
	disconnectPromotionCheckout: vi.fn<typeof PromotionsApi.disconnectPromotionCheckout>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const applyConfig = (checkout = { hasCheckout: false, matchesConfig: false }) => ({
	id: 'config-apply',
	name: 'Apply',
	settings: { schemaVersion: 1 as const, branchName: 'main' },
	checkout,
	...timestamps,
});

const provider = {
	id: 'provider-ssh',
	name: 'Production key',
	type: 'git',
	authType: 'ssh-key',
	...timestamps,
} as PromotionProviderSummary;

const connectionWith = (
	configs: PromotionConnection['configs'] = { apply: applyConfig() },
): PromotionConnection =>
	({
		id: 'connection-1',
		name: 'Production',
		scope: 'instance',
		target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
		provider,
		configs,
		...timestamps,
	}) as PromotionConnection;

const checkoutResult = (hasCheckout: boolean) => ({
	connectionId: 'connection-1',
	configId: 'config-apply',
	direction: 'apply' as const,
	branchName: 'main',
	hasCheckout,
});

const renderComponent = createComponentRenderer(PromotionConnectionForm, {
	props: { providers: [provider] },
});

// The saved connection each test emits `saved` against.
const lastSaved = (emitted: (event: string) => unknown[]): PromotionConnection => {
	const events = emitted('saved') as Array<[PromotionConnection]>;
	return events[events.length - 1][0];
};

describe('PromotionConnectionForm', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
	});

	it('blocks Connect for a direction that is enabled but not yet saved', async () => {
		const { getByTestId } = renderComponent({ props: { connection: connectionWith({}) } });

		// Turning Apply on expands the row before the config exists on the server.
		await userEvent.click(getByTestId('promotion-connection-apply-toggle'));

		expect(getByTestId('promotion-checkout-connect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-status')).toHaveTextContent(
			'Save this connection before you connect.',
		);
		expect(api.clonePromotionCheckout).not.toHaveBeenCalled();
	});

	it('blocks Connect while the form has unsaved changes', async () => {
		const { getByTestId } = renderComponent({
			props: { connection: connectionWith({ apply: applyConfig() }) },
		});

		expect(getByTestId('promotion-checkout-connect')).toBeEnabled();

		await userEvent.type(getByTestId('promotion-connection-name-input'), '-edited');

		expect(getByTestId('promotion-checkout-connect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-status')).toHaveTextContent(
			'Save your changes before you connect.',
		);
	});

	it('connects a saved direction and reports the new checkout', async () => {
		api.clonePromotionCheckout.mockResolvedValue(checkoutResult(true));
		const { getByTestId, emitted } = renderComponent({
			props: { connection: connectionWith({ apply: applyConfig() }) },
		});

		await userEvent.click(getByTestId('promotion-checkout-connect'));

		await waitFor(() =>
			expect(api.clonePromotionCheckout).toHaveBeenCalledWith(
				expect.anything(),
				'connection-1',
				'apply',
			),
		);
		expect(lastSaved(emitted).configs.apply?.checkout).toEqual({
			hasCheckout: true,
			matchesConfig: true,
		});
		expect(mockShowMessage).toHaveBeenCalled();
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('disconnects a connected direction', async () => {
		api.disconnectPromotionCheckout.mockResolvedValue(checkoutResult(false));
		const { getByTestId, emitted } = renderComponent({
			props: {
				connection: connectionWith({
					apply: applyConfig({ hasCheckout: true, matchesConfig: true }),
				}),
			},
		});

		await userEvent.click(getByTestId('promotion-checkout-disconnect'));

		await waitFor(() =>
			expect(api.disconnectPromotionCheckout).toHaveBeenCalledWith(
				expect.anything(),
				'connection-1',
				'apply',
			),
		);
		expect(lastSaved(emitted).configs.apply?.checkout).toEqual({
			hasCheckout: false,
			matchesConfig: false,
		});
		expect(mockShowMessage).toHaveBeenCalled();
	});

	it('keeps the form usable when connecting fails', async () => {
		const failure = new Error('git is unreachable');
		api.clonePromotionCheckout.mockRejectedValueOnce(failure);
		const { getByTestId, emitted } = renderComponent({
			props: { connection: connectionWith({ apply: applyConfig() }) },
		});

		await userEvent.click(getByTestId('promotion-checkout-connect'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(failure, expect.any(String)));
		expect(emitted('saved')).toBeUndefined();
		expect(getByTestId('promotion-checkout-connect')).toBeEnabled();
	});
});
