import type { ServiceAccountsList } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';

import { renderComponent } from '@/__tests__/render';

import SettingsServiceAccountsView from './SettingsServiceAccountsView.vue';
import { useServiceAccountsStore } from '../serviceAccounts.store';

const grantedScopes = vi.hoisted(() => ({ value: [] as string[] }));

vi.mock('@n8n/stores/roles.store', () => ({
	useRolesStore: () => ({
		fetchRoles: vi.fn(),
		roles: { global: [] },
		processedInstanceRoles: [],
		customInstanceRoles: [],
	}),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: (_checks: string[], options?: { rbac?: { scope?: string | string[] } }) => {
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

	it('keeps the create action available once accounts exist', async () => {
		await renderView(makeList([serviceAccount]));

		// Regressed once: the button lived only in the empty state and in a header
		// slot that does not exist, so a second account could never be created.
		expect(screen.getByTestId('create-service-account-button')).toBeInTheDocument();
	});

	it('hides the create action alongside the table without serviceAccount:create', async () => {
		grantedScopes.value = ['serviceAccount:list'];

		await renderView(makeList([serviceAccount]));

		expect(screen.getByTestId('service-accounts-table')).toBeInTheDocument();
		expect(screen.queryByTestId('create-service-account-button')).not.toBeInTheDocument();
	});

	it('marks a disabled service account', async () => {
		await renderView(makeList([{ ...serviceAccount, disabled: true }]));

		expect(screen.getByText('Disabled')).toBeInTheDocument();
	});
});
