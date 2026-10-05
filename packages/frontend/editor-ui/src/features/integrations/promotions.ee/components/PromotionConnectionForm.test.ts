import { createTestingPinia } from '@pinia/testing';
import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionConnection, PromotionProviderSummary } from '../promotionsSettings.api';
import PromotionConnectionForm from './PromotionConnectionForm.vue';

const api = vi.hoisted(() => ({
	createPromotionConnection: vi.fn<typeof PromotionsApi.createPromotionConnection>(),
	clonePromotionCheckout: vi.fn<typeof PromotionsApi.clonePromotionCheckout>(),
	disconnectPromotionCheckout: vi.fn<typeof PromotionsApi.disconnectPromotionCheckout>(),
	fetchPromotionRepositories: vi.fn<typeof PromotionsApi.fetchPromotionRepositories>(),
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
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

	const gitLabProvider = {
		id: 'provider-gitlab',
		name: 'GitLab',
		type: 'gitlab',
		authType: 'token',
		...timestamps,
	} as PromotionProviderSummary;

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
		expect(api.clonePromotionCheckout).not.toHaveBeenCalled();
	});

	it('blocks Connect and Disconnect without the clone scope', async () => {
		usersStore.currentUser = mock<IUser>({ globalScopes: [] });
		// A stale checkout renders both actions, so we can assert both are blocked.
		const { getByTestId } = renderComponent({
			props: {
				connection: connectionWith({
					apply: applyConfig({ hasCheckout: true, matchesConfig: false }),
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
	it('picks a repository for a GitLab provider instead of taking a URL', async () => {
		api.fetchPromotionRepositories.mockResolvedValue({ data: [], nextCursor: null });
		const gitLabConnection = {
			...connectionWith({}),
			target: { schemaVersion: 1, remoteUrl: 'https://gitlab.example.com/acme/workflows.git' },
			provider: gitLabProvider,
		} as PromotionConnection;

		const { getByTestId, queryByTestId } = renderComponent({
			props: { providers: [provider, gitLabProvider], connection: gitLabConnection },
		});

		expect(getByTestId('promotion-connection-repository-select')).toBeInTheDocument();
		expect(queryByTestId('promotion-connection-remote-url-input')).not.toBeInTheDocument();
		await waitFor(() =>
			expect(api.fetchPromotionRepositories).toHaveBeenCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ search: undefined },
			),
		);
	});

	it('takes a remote URL for a plain Git provider', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { connection: connectionWith() },
		});

		expect(getByTestId('promotion-connection-remote-url-input')).toBeInTheDocument();
		expect(queryByTestId('promotion-connection-repository-select')).not.toBeInTheDocument();
		expect(api.fetchPromotionRepositories).not.toHaveBeenCalled();
	});

	it('requires a new repository when another Git host provider is selected', async () => {
		api.fetchPromotionRepositories.mockResolvedValue({ data: [], nextCursor: null });
		const other = { ...gitLabProvider, id: 'provider-other', name: 'Other GitLab' };
		const connection = {
			...connectionWith({}),
			provider: gitLabProvider,
			target: {
				schemaVersion: 1 as const,
				remoteUrl: 'https://gitlab.example.com/previous/repo.git',
			},
		};
		const { getByTestId, queryByText } = renderComponent({
			props: { providers: [provider, gitLabProvider, other], connection },
		});
		const options = await getDropdownItems(getByTestId('promotion-connection-provider-select'));

		await userEvent.click(options[2]);

		await waitFor(() =>
			expect(api.fetchPromotionRepositories).toHaveBeenLastCalledWith(expect.anything(), other.id, {
				search: undefined,
			}),
		);
		expect(queryByText(connection.target.remoteUrl)).not.toBeInTheDocument();
		expect(
			within(getByTestId('promotion-connection-save-bar')).getByRole('button', {
				name: /save settings/i,
			}),
		).toBeDisabled();
	});
});
