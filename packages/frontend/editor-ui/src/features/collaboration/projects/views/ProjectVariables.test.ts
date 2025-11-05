import ProjectVariables from './ProjectVariables.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/app/constants';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { createRouter, createWebHistory } from 'vue-router';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { Scope } from '@n8n/permissions';
import type { EnvironmentVariable } from '@/features/settings/environments.ee/environments.types';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import type { SourceControlPreferences } from '@/features/integrations/sourceControl.ee/sourceControl.types';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'ProjectVariables',
			component: { template: '<div></div>' },
		},
		{
			path: '/projects/:projectId/variables',
			name: 'ProjectVariablesWithId',
			component: { template: '<div></div>' },
		},
	],
});

const renderComponent = createComponentRenderer(ProjectVariables, {
	global: { plugins: [router] },
});

const fullAccessScopes: Scope[] = [
	'variable:create',
	'variable:read',
	'variable:update',
	'variable:delete',
	'variable:list',
];

describe('ProjectVariables', () => {
	beforeEach(async () => {
		createTestingPinia({ initialState: { [STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE } });
		await router.push('/');
		await router.isReady();
	});

	describe('should render empty state', () => {
		it('when feature is disabled and user does not have create permission', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;

			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { globalScopes: ['variable:read', 'variable:list'] } as IUser;

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is disabled and user has full access', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = false;

			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { globalScopes: fullAccessScopes } as IUser;

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).toBeVisible();
				expect(queryByTestId('cannot-create-variables')).not.toBeInTheDocument();
			});
		});

		it('when feature is enabled and user does not have create permission', async () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;

			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { globalScopes: ['variable:read', 'variable:list'] } as IUser;

			const { queryByTestId } = renderComponent();

			await waitFor(() => {
				expect(queryByTestId('empty-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('unavailable-resources-list')).not.toBeInTheDocument();
				expect(queryByTestId('cannot-create-variables')).toBeVisible();
			});
		});
	});

	const userWithPrivileges = (variables: EnvironmentVariable[]) => {
		const usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = { globalScopes: fullAccessScopes } as IUser;

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;

		const environmentsStore = mockedStore(useEnvironmentsStore);
		environmentsStore.variables = variables;

		const uiStore = mockedStore(useUIStore);

		// Mock project store so that project header renders correctly
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = {
			id: 'personal-project-id',
			name: 'Current Project',
			scopes: ['projectVariable:create', 'projectVariable:read'],
		} as Project;
		projectsStore.currentProject = projectsStore.personalProject;

		const sourceControlStore = mockedStore(useSourceControlStore);
		sourceControlStore.preferences = {
			branchReadOnly: false,
		} as SourceControlPreferences;

		return {
			usersStore,
			settingsStore,
			environmentsStore,
			uiStore,
			projectsStore,
			sourceControlStore,
		};
	};

	it('should render variable entries', async () => {
		userWithPrivileges([
			{
				id: '1',
				key: 'VAR_A',
				value: 'value a',
			},
			{
				id: '2',
				key: 'VAR_B',
				value: 'value b',
			},
			{
				id: '3',
				key: 'VAR_C',
				value: 'value c',
			},
		]);

		const wrapper = renderComponent();

		const table = await wrapper.findByTestId('resources-table');
		expect(table).toBeVisible();
		expect(wrapper.container.querySelectorAll('tr')).toHaveLength(4);
	});

	it('should truncate long variable values', async () => {
		userWithPrivileges([
			{
				id: '1',
				key: 'LONG_VAR',
				value: 'This is a very long variable value that should be truncated',
			},
		]);

		const { findByTestId, getByText, queryByText } = renderComponent();

		const table = await findByTestId('resources-table');
		expect(table).toBeVisible();
		expect(queryByText('This is a very long variable value that should be truncated')).toBeNull();
		expect(getByText('This is a very long ...')).toBeVisible();
	});

	it('should display scope badge for global variables', async () => {
		userWithPrivileges([
			{
				id: '1',
				key: 'GLOBAL_VAR',
				value: 'global value',
			},
		]);

		const { findAllByText } = renderComponent();

		const globalTextElements = await findAllByText('Global');
		const scopeBadge = globalTextElements.filter((el) => el.className.includes('scope-badge'))[0];
		expect(scopeBadge).toBeVisible();
	});

	it('should display scope badge for project variables', async () => {
		userWithPrivileges([
			{
				id: '1',
				key: 'PROJECT_VAR',
				value: 'project value',
				project: {
					id: 'project-1',
					name: 'Test Project',
				},
			},
		]);

		const { findByText } = renderComponent();

		const scopeBadge = await findByText('Test Project');
		expect(scopeBadge).toBeVisible();
	});

	it('should display all variables when no project filter', async () => {
		userWithPrivileges([
			{
				id: '1',
				key: 'GLOBAL_VAR',
				value: 'global',
			},
			{
				id: '2',
				key: 'PROJECT_VAR',
				value: 'project',
				project: {
					id: 'project-1',
					name: 'Test Project',
				},
			},
			{
				id: '3',
				key: 'OTHER_PROJECT_VAR',
				value: 'other',
				project: {
					id: 'project-2',
					name: 'Other Project',
				},
			},
		]);

		const { findByTestId, queryAllByTestId } = renderComponent();

		await findByTestId('resources-table');
		// Should show all variables when no project filter
		expect(queryAllByTestId('variables-row')).toHaveLength(3);
	});

	describe('variable modal interactions', () => {
		it('should open create modal when add button is clicked', async () => {
			const { uiStore } = userWithPrivileges([
				{
					id: '1',
					key: 'EXISTING_VAR',
					value: 'value',
				},
			]);

			const { getByTestId } = renderComponent();
			await waitFor(() => expect(getByTestId('add-resource-variable')).toBeVisible());

			await userEvent.click(getByTestId('add-resource-variable'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: VARIABLE_MODAL_KEY,
				data: { mode: 'new' },
			});
		});

		it('should open edit modal when edit button is clicked', async () => {
			const variables = [
				{
					id: '1',
					key: 'TEST_VAR',
					value: 'test value',
				},
			];

			const { uiStore } = userWithPrivileges(variables);

			const { getByTestId } = renderComponent();
			await waitFor(() => expect(getByTestId('variables-row')).toBeVisible());

			await userEvent.hover(getByTestId('variables-row'));
			expect(getByTestId('variable-row-edit-button')).toBeVisible();
			await userEvent.click(getByTestId('variable-row-edit-button'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: VARIABLE_MODAL_KEY,
				data: {
					mode: 'edit',
					variable: expect.objectContaining({
						id: '1',
						key: 'TEST_VAR',
						value: 'test value',
					}),
				},
			});
		});
	});

	describe('delete variable', () => {
		it('should show delete button on hover', async () => {
			const variables = [
				{
					id: '1',
					key: 'VAR_TO_DELETE',
					value: 'value',
				},
				{
					id: '2',
					key: 'VAR_TO_KEEP',
					value: 'value',
				},
			];

			userWithPrivileges(variables);

			const { queryAllByTestId } = renderComponent();
			await waitFor(() => expect(queryAllByTestId('variables-row')).toHaveLength(2));

			await userEvent.hover(queryAllByTestId('variables-row')[0]);
			expect(queryAllByTestId('variable-row-delete-button')[0]).toBeVisible();
		});
	});

	describe('filter', () => {
		it('should filter by incomplete (missing value)', async () => {
			userWithPrivileges([
				{
					id: '1',
					key: 'COMPLETE_VAR',
					value: 'has value',
				},
				{
					id: '2',
					key: 'INCOMPLETE_VAR',
					value: '',
				},
			]);

			const { getByTestId, queryAllByTestId } = renderComponent();
			await waitFor(() => expect(queryAllByTestId('variables-row')).toHaveLength(2));

			await userEvent.click(getByTestId('variable-filter-incomplete'));

			expect(queryAllByTestId('variables-row')).toHaveLength(1);
		});
	});

	describe('sorting', () => {
		it('should sort by name (asc | desc)', async () => {
			userWithPrivileges([
				{
					id: '1',
					key: 'BETA',
					value: 'b',
				},
				{
					id: '2',
					key: 'ALPHA',
					value: 'a',
				},
			]);

			const { getByTestId, queryAllByTestId } = renderComponent();
			await waitFor(() => expect(queryAllByTestId('variables-row')).toHaveLength(2));

			// Default sort should be ascending
			expect(queryAllByTestId('variables-row')[0].querySelector('td')?.textContent).toBe('ALPHA');

			// Change to descending
			await userEvent.click(getByTestId('resources-list-sort'));
			await userEvent.click(queryAllByTestId('resources-list-sort-item')[1]);

			expect(queryAllByTestId('variables-row')[0].querySelector('td')?.textContent).toBe('BETA');
		});
	});

	describe('value display', () => {
		it('should display variable value when present', async () => {
			userWithPrivileges([
				{
					id: '1',
					key: 'VAR_WITH_VALUE',
					value: 'some value',
				},
			]);

			const { findByTestId, queryAllByTestId } = renderComponent();

			await findByTestId('resources-table');
			const rows = queryAllByTestId('variables-row');
			expect(rows).toHaveLength(1);
			// Value should be displayed (truncated)
			expect(rows[0].textContent).toContain('some value');
		});

		it('should handle empty value', async () => {
			userWithPrivileges([
				{
					id: '1',
					key: 'VAR_WITHOUT_VALUE',
					value: '',
				},
			]);

			const { findByTestId, queryAllByTestId } = renderComponent();

			await findByTestId('resources-table');
			const rows = queryAllByTestId('variables-row');
			expect(rows).toHaveLength(1);
		});
	});

	describe('permissions', () => {
		it('should disable edit button when user lacks update permission', async () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { globalScopes: ['variable:read', 'variable:list'] } as IUser;

			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;

			const environmentsStore = mockedStore(useEnvironmentsStore);
			environmentsStore.variables = [
				{
					id: '1',
					key: 'TEST_VAR',
					value: 'value',
				},
			];

			const { getByTestId } = renderComponent();
			await waitFor(() => expect(getByTestId('variables-row')).toBeVisible());

			await userEvent.hover(getByTestId('variables-row'));
			const editButton = getByTestId('variable-row-edit-button');
			expect(editButton).toBeDisabled();
		});

		it('should disable delete button when user lacks delete permission', async () => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { globalScopes: ['variable:read', 'variable:list'] } as IUser;

			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.settings.enterprise[EnterpriseEditionFeature.Variables] = true;

			const environmentsStore = mockedStore(useEnvironmentsStore);
			environmentsStore.variables = [
				{
					id: '1',
					key: 'TEST_VAR',
					value: 'value',
				},
			];

			const { getByTestId } = renderComponent();

			await waitFor(() => expect(getByTestId('variables-row')).toBeVisible());

			await userEvent.hover(getByTestId('variables-row'));
			const deleteButton = getByTestId('variable-row-delete-button');
			expect(deleteButton).toBeDisabled();
		});
	});

	describe('scope column visibility', () => {
		it('should show scope column when not in project context', async () => {
			await router.push('/');

			userWithPrivileges([
				{
					id: '1',
					key: 'TEST_VAR',
					value: 'value',
				},
			]);

			const { container, findByTestId } = renderComponent();

			await findByTestId('resources-table');
			// Scope column header should be visible - check for 4 columns (key, value, usage, scope)
			const headerCells = container.querySelectorAll('thead th');
			expect(headerCells.length).toBeGreaterThanOrEqual(4);
		});
	});
});
