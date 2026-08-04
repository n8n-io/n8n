import { ROLE, type ServiceAccountsList } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';

import { renderComponent } from '@/__tests__/render';

import SettingsServiceAccountsView from './SettingsServiceAccountsView.vue';
import { useServiceAccountsStore } from '../serviceAccounts.store';

const grantedScopes = vi.hoisted(() => ({ value: [] as string[] }));
const grantedRoles = vi.hoisted(() => ({ value: [] as string[] }));

vi.mock('@n8n/stores/roles.store', () => ({
	useRolesStore: () => ({
		fetchRoles: vi.fn(),
		roles: { global: [] },
		processedInstanceRoles: [],
		customInstanceRoles: [],
	}),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: (
		checks: string[],
		options?: { rbac?: { scope?: string | string[] }; role?: string[] },
	) => {
		if (checks.includes('role')) {
			return (options?.role ?? []).some((role) => grantedRoles.value.includes(role));
		}
		const scope = options?.rbac?.scope;
		const scopes = Array.isArray(scope) ? scope : [scope];
		return scopes.every((s) => s !== undefined && grantedScopes.value.includes(s));
	},
}));

const makeList = (items: ServiceAccountsList['items']): ServiceAccountsList => ({
	count: items.length,
	items,
});

const serviceAccount = {
	id: 'sa-1',
	name: 'Deploy Bot',
	email: 'deploy-bot-abcd@service-accounts.invalid',
	role: 'global:member',
	disabled: false,
};

const renderView = async (list: ServiceAccountsList) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const store = useServiceAccountsStore();
	// `execute` is what the view calls; feed it the fixture instead of the network.
	store.serviceAccountsList.execute = vi.fn(async () => {
		Object.assign(store.serviceAccountsList.state, list);
		return list;
	}) as never;
	Object.assign(store.serviceAccountsList.state, list);
	store.listCredentials = vi.fn(async () => []);

	const rendered = renderComponent(SettingsServiceAccountsView, { pinia });
	await waitFor(() => expect(screen.getByTestId('service-accounts-header')).toBeInTheDocument());
	return { store, ...rendered };
};

describe('SettingsServiceAccountsView', () => {
	beforeEach(() => {
		grantedScopes.value = [
			'serviceAccount:list',
			'serviceAccount:create',
			'serviceAccount:update',
			'serviceAccount:delete',
			'serviceAccount:impersonate',
		];
		grantedRoles.value = [];
	});

	it('shows the empty state with a create action when there are none', async () => {
		await renderView(makeList([]));

		expect(screen.getByTestId('service-accounts-empty-state')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Create service account' })).toBeInTheDocument();
		expect(screen.queryByTestId('service-accounts-table')).not.toBeInTheDocument();
	});

	it('hides the create action without serviceAccount:create', async () => {
		grantedScopes.value = ['serviceAccount:list'];

		await renderView(makeList([]));

		expect(screen.getByTestId('service-accounts-empty-state')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Create service account' }),
		).not.toBeInTheDocument();
	});

	it('renders the table and both identities of a row', async () => {
		await renderView(makeList([serviceAccount]));

		expect(screen.getByTestId('service-accounts-table')).toBeInTheDocument();
		expect(screen.getByText('Deploy Bot')).toBeInTheDocument();
		// The synthesized address is shown for traceability.
		expect(screen.getByText(serviceAccount.email)).toBeInTheDocument();
		expect(screen.queryByTestId('service-accounts-empty-state')).not.toBeInTheDocument();
	});

	it('marks a disabled service account', async () => {
		await renderView(makeList([{ ...serviceAccount, disabled: true }]));

		expect(screen.getByText('Disabled')).toBeInTheDocument();
	});

	it('opens the credentials modal from the row action', async () => {
		grantedRoles.value = [ROLE.Owner];
		const { store } = await renderView(makeList([serviceAccount]));
		const user = userEvent.setup();

		await user.click(within(screen.getByTestId('action-toggle')).getByRole('button'));
		await user.click(await screen.findByTestId('action-credentials'));

		expect(await screen.findByTestId('service-account-credentials-modal')).toBeInTheDocument();
		expect(store.listCredentials).toHaveBeenCalledWith(serviceAccount.id);
	});

	it('hides the credentials action for non-owner/admin roles', async () => {
		await renderView(makeList([serviceAccount]));
		const user = userEvent.setup();

		await user.click(within(screen.getByTestId('action-toggle')).getByRole('button'));

		expect(await screen.findByTestId('action-impersonate')).toBeInTheDocument();
		expect(screen.queryByTestId('action-credentials')).not.toBeInTheDocument();
	});
});
