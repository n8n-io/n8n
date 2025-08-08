import VariablesView from '@/views/VariablesView.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useRBACStore } from '@/stores/rbac.store';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/constants';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { createRouter, createWebHistory } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import type { EnvironmentVariable } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { Scope } from '@n8n/permissions';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			component: { template: '<div></div>' },
		},
	],
});

const renderComponent = createComponentRenderer(VariablesView, { global: { plugins: [router] } });

const fullAccessScopes: Scope[] = [
	'variable:create',
	'variable:read',
	'variable:update',
	'variable:delete',
	'variable:list',
];

describe('VariablesView', () => {
	beforeEach(async () => {
		createTestingPinia({ initialState: { [STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE } });
		await router.push('/');
		await router.isReady();
	});

	describe('should render empty state', () => {
		it('when feature is disabled and logged in user is not owner', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;
			const rbacStore = mockedStore(useRBACStore);
			rbacStore.globalScopes = ['variable:read', 'variable:list'];

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is disabled and logged in user is owner', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;
			const rbacStore = mockedStore(useRBACStore);
			rbacStore.globalScopes = fullAccessScopes;

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is enabled and logged in user is owner', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;
			const rbacStore = mockedStore(useRBACStore);
			rbacStore.globalScopes = [
				'variable:create',
				'variable:read',
				'variable:update',
				'variable:delete',
				'variable:list',
			];

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is enabled and logged in user is not owner', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;
			const rbacStore = mockedStore(useRBACStore);
			rbacStore.globalScopes = ['variable:read', 'variable:list'];

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).toBeVisible();
			});
		});
	});

	const userWithPrivileges = (variables: EnvironmentVariable[]) => {
		const userStore = mockedStore(useUsersStore);
		userStore.currentUser = { globalScopes: fullAccessScopes } as IUser;
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;
		const environmentsStore = mockedStore(useEnvironmentsStore);
		environmentsStore.variables = variables;

		return { userStore, settingsStore, environmentsStore };
	};

	it('should render variable entries', async () => {
		userWithPrivileges([
			{
				id: '1',
				key: 'a',
				value: 'a',
			},
			{
				id: '2',
				key: 'b',
				value: 'b',
			},
			{
				id: '3',
				key: 'c',
				value: 'c',
			},
		]);

		const wrapper = renderComponent();

		const table = await wrapper.findByTestId('resources-table');
		expect(table).toBeVisible();
		expect(wrapper.container.querySelectorAll('tr')).toHaveLength(4);
	});

	describe('CRUD', () => {
		it('should create variables', async () => {
			const { environmentsStore } = userWithPrivileges([
				{
					id: '1',
					key: 'a',
					value: 'a',
				},
			]);

			const { getByTestId, queryAllByTestId, getByPlaceholderText } = renderComponent();
			await waitFor(() => expect(getByTestId('resources-list-add')).toBeVisible());

			expect(queryAllByTestId('variables-row').length).toBe(1);

			await userEvent.click(getByTestId('resources-list-add'));

			expect(queryAllByTestId('variables-row').length).toBe(2);

			const newVariable = { key: 'b', value: 'b' };

			await userEvent.type(getByPlaceholderText('Enter a name'), newVariable.key);
			await userEvent.type(getByPlaceholderText('Enter a value'), newVariable.value);

			await userEvent.click(getByTestId('variable-row-save-button'));

			expect(environmentsStore.createVariable).toHaveBeenCalledWith(newVariable);
		});

		it('should delete variables', async () => {
			const { environmentsStore } = userWithPrivileges([
				{
					id: '1',
					key: 'a',
					value: 'a',
				},
				{
					id: '2',
					key: 'b',
					value: 'b',
				},
			]);

			const { getByTestId, queryAllByTestId, getByLabelText, queryAllByLabelText } =
				renderComponent();
			await waitFor(() => expect(getByTestId('resources-list-add')).toBeVisible());

			expect(queryAllByTestId('variables-row').length).toBe(2);

			await userEvent.hover(queryAllByTestId('variables-row')[0]);
			expect(queryAllByTestId('variable-row-delete-button')[0]).toBeVisible();
			await userEvent.click(queryAllByTestId('variable-row-delete-button')[0]);

			// Cancel
			expect(getByLabelText('Delete variable')).toBeVisible();
			await userEvent.click(within(getByLabelText('Delete variable')).getByText('Cancel'));
			expect(environmentsStore.deleteVariable).not.toHaveBeenCalled();

			await userEvent.hover(queryAllByTestId('variables-row')[0]);
			expect(queryAllByTestId('variable-row-delete-button')[0]).toBeVisible();
			await userEvent.click(queryAllByTestId('variable-row-delete-button')[0]);

			// Delete
			const dialog = queryAllByLabelText('Delete variable').at(-1);
			expect(dialog).toBeVisible();
			await userEvent.click(within(dialog as HTMLElement).getByText('Delete'));

			expect(environmentsStore.deleteVariable).toHaveBeenCalledWith(environmentsStore.variables[0]);
		});

		it('should update variable', async () => {
			const { environmentsStore } = userWithPrivileges([
				{
					id: '1',
					key: 'a',
					value: 'a',
				},
			]);

			const { getByTestId, queryAllByTestId, getByPlaceholderText } = renderComponent();
			await waitFor(() => expect(getByTestId('resources-list-add')).toBeVisible());

			expect(queryAllByTestId('variables-row').length).toBe(1);

			await userEvent.hover(getByTestId('variables-row'));

			expect(getByTestId('variable-row-edit-button')).toBeVisible();
			await userEvent.click(getByTestId('variable-row-edit-button'));

			const newVariable = { id: '1', key: 'ab', value: 'ab' };

			await userEvent.type(getByPlaceholderText('Enter a name'), 'b');
			await userEvent.type(getByPlaceholderText('Enter a value'), 'b');

			await userEvent.click(getByTestId('variable-row-save-button'));

			expect(environmentsStore.updateVariable).toHaveBeenCalledWith(newVariable);
		});
	});

	describe('filter', () => {
		it('should filter by incomplete', async () => {
			userWithPrivileges([
				{
					id: '1',
					key: 'a',
					value: 'a',
				},
				{
					id: '2',
					key: 'b',
					value: '',
				},
			]);

			const { getByTestId, queryAllByTestId } = renderComponent();
			await waitFor(() => expect(getByTestId('resources-list-add')).toBeVisible());

			expect(queryAllByTestId('variables-row').length).toBe(2);
			await userEvent.click(getByTestId('variable-filter-incomplete'));

			expect(queryAllByTestId('variables-row').length).toBe(1);
		});
	});

	describe('sorting', () => {
		it('should sort by name (asc | desc)', async () => {
			userWithPrivileges([
				{
					id: '1',
					key: 'a',
					value: 'a',
				},
				{
					id: '2',
					key: 'b',
					value: 'b',
				},
			]);

			const { getByTestId, queryAllByTestId } = renderComponent();
			await waitFor(() => expect(getByTestId('resources-list-add')).toBeVisible());

			expect(queryAllByTestId('variables-row').length).toBe(2);
			expect(queryAllByTestId('variables-row')[0].querySelector('td')?.textContent).toBe('a');

			await userEvent.click(getByTestId('resources-list-sort'));
			await userEvent.click(queryAllByTestId('resources-list-sort-item')[1]);

			expect(queryAllByTestId('variables-row')[0].querySelector('td')?.textContent).toBe('b');
		});
	});
});
