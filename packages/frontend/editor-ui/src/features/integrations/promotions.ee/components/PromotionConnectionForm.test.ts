import { createTestingPinia } from '@pinia/testing';
import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionConnection, PromotionProviderSummary } from '../promotionsSettings.api';
import PromotionConnectionForm from './PromotionConnectionForm.vue';

const api = vi.hoisted(() => ({
	connectPromotionCheckout: vi.fn<typeof PromotionsApi.connectPromotionCheckout>(),
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

const provider: PromotionProviderSummary = {
	id: 'provider-ssh',
	name: 'Production key',
	type: 'git',
	authType: 'ssh-key',
	...timestamps,
};

const remote = { schemaVersion: 1 as const, remoteUrl: 'git@github.com:acme/workflows.git' };

const applyConfig = (checkout = { hasCheckout: false, matchesEnvironment: false }) => ({
	id: 'environment-apply',
	name: 'Production',
	scope: 'instance' as const,
	direction: 'apply' as const,
	remote,
	provider,
	settings: { schemaVersion: 1 as const, branchName: 'main' },
	checkout,
	...timestamps,
});

const connectionWith = (
	configs: PromotionConnection['configs'] = { apply: applyConfig() },
): PromotionConnection => ({ name: 'Production', remote, provider, configs });

const checkoutResult = (hasCheckout: boolean) => ({
	environmentId: 'environment-apply',
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
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:clone'] });
	});

	it('blocks Connect for a direction that is enabled but not yet saved', async () => {
		const { getByTestId } = renderComponent({ props: { connection: connectionWith({}) } });

		// Turning Apply on expands the row before the config exists on the server.
		await userEvent.click(getByTestId('promotion-connection-apply-toggle'));

		expect(getByTestId('promotion-checkout-connect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-status')).toHaveTextContent(
			'Save this connection before you connect.',
		);
		expect(api.connectPromotionCheckout).not.toHaveBeenCalled();
	});

	it('blocks Connect and Disconnect without the clone scope', async () => {
		usersStore.currentUser = mock<IUser>({ globalScopes: [] });
		// A stale checkout renders both actions, so we can assert both are blocked.
		const { getByTestId } = renderComponent({
			props: {
				connection: connectionWith({
					apply: applyConfig({ hasCheckout: true, matchesEnvironment: false }),
				}),
			},
		});

		expect(getByTestId('promotion-checkout-connect')).toBeDisabled();
		expect(getByTestId('promotion-checkout-disconnect')).toBeDisabled();
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
		api.connectPromotionCheckout.mockResolvedValue(checkoutResult(true));
		const { getByTestId, emitted } = renderComponent({
			props: { connection: connectionWith({ apply: applyConfig() }) },
		});

		await userEvent.click(getByTestId('promotion-checkout-connect'));

		await waitFor(() =>
			expect(api.connectPromotionCheckout).toHaveBeenCalledWith(
				expect.anything(),
				'environment-apply',
			),
		);
		expect(lastSaved(emitted).configs.apply?.checkout).toEqual({
			hasCheckout: true,
			matchesEnvironment: true,
		});
		expect(mockShowMessage).toHaveBeenCalled();
		expect(mockShowError).not.toHaveBeenCalled();
	});

	it('disconnects a connected direction', async () => {
		api.disconnectPromotionCheckout.mockResolvedValue(checkoutResult(false));
		const { getByTestId, emitted } = renderComponent({
			props: {
				connection: connectionWith({
					apply: applyConfig({ hasCheckout: true, matchesEnvironment: true }),
				}),
			},
		});

		await userEvent.click(getByTestId('promotion-checkout-disconnect'));

		await waitFor(() =>
			expect(api.disconnectPromotionCheckout).toHaveBeenCalledWith(
				expect.anything(),
				'environment-apply',
			),
		);
		expect(lastSaved(emitted).configs.apply?.checkout).toEqual({
			hasCheckout: false,
			matchesEnvironment: false,
		});
		expect(mockShowMessage).toHaveBeenCalled();
	});

	it('keeps the form usable when connecting fails', async () => {
		const failure = new Error('git is unreachable');
		api.connectPromotionCheckout.mockRejectedValueOnce(failure);
		const { getByTestId, emitted } = renderComponent({
			props: { connection: connectionWith({ apply: applyConfig() }) },
		});

		await userEvent.click(getByTestId('promotion-checkout-connect'));

		await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(failure, expect.any(String)));
		expect(emitted('saved')).toBeUndefined();
		expect(getByTestId('promotion-checkout-connect')).toBeEnabled();
	});
});
