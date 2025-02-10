import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '@/stores/projects.store';
import { createTestingPinia } from '@pinia/testing';
import { STORES, VIEWS } from '@/constants';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import type { IUser, IWorkflowDb } from '@/Interface';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { Project } from '@/types/projects.types';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useTagsStore } from '@/stores/tags.store';
import { createRouter, createWebHistory } from 'vue-router';
import * as usersApi from '@/api/users';
import { IConnections } from 'n8n-workflow';

vi.mock('@/api/projects.api');
vi.mock('@/api/users');
vi.mock('@/api/sourceControl');
vi.mock('@/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/:projectId?',
			component: { template: '<div></div>' },
		},
		{
			path: '/workflow',
			name: VIEWS.NEW_WORKFLOW,
			component: { template: '<div></div>' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowsView, {
	global: {
		plugins: [router],
	},
});

const initialState = {
	[STORES.SETTINGS]: { settings: { enterprise: { sharing: false } } },
};

describe('WorkflowsView', () => {
	beforeEach(async () => {
		await router.push('/');
		await router.isReady();
	});

	describe('should show empty state', () => {
		it('for non setup user', () => {
			const { getByText } = renderComponent({ pinia: createTestingPinia({ initialState }) });
			expect(getByText('👋 Welcome!')).toBeVisible();
		});

		it('for currentUser user', () => {
			const pinia = createTestingPinia({ initialState });
			const userStore = mockedStore(useUsersStore);
			userStore.currentUser = { firstName: 'John' } as IUser;
			const { getByText } = renderComponent({ pinia });

			expect(getByText('👋 Welcome John!')).toBeVisible();
		});

		describe('when onboardingExperiment -> False', () => {
			const pinia = createTestingPinia({ initialState });
			const sourceControl = mockedStore(useSourceControlStore);

			const projectsStore = mockedStore(useProjectsStore);

			it('for readOnlyEnvironment', () => {
				sourceControl.preferences.branchReadOnly = true;

				const { getByText } = renderComponent({ pinia });
				expect(getByText('No workflows here yet')).toBeInTheDocument();
				sourceControl.preferences.branchReadOnly = false;
			});

			it('for noPermission', () => {
				const { getByText } = renderComponent({ pinia });
				expect(getByText('There are currently no workflows to view')).toBeInTheDocument();
			});

			it('for user with create scope', () => {
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
				const { getByText } = renderComponent({ pinia });
				expect(getByText('Create your first workflow')).toBeInTheDocument();
			});
		});

		it('should allow workflow creation', async () => {
			const pinia = createTestingPinia({ initialState });
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
			const { getByTestId } = renderComponent({ pinia });

			expect(getByTestId('new-workflow-card')).toBeInTheDocument();

			await userEvent.click(getByTestId('new-workflow-card'));

			expect(router.currentRoute.value.name).toBe(VIEWS.NEW_WORKFLOW);
		});
	});

	describe.only('filters', () => {
		it.only('should set tag filter based on query parameters', async () => {
			await router.replace({ query: { tags: 'test-tag' } });

			const pinia = createTestingPinia({ initialState });
			const tagStore = mockedStore(useTagsStore);
			const TEST_TAG = { id: 'test-tag', name: 'tag' };
			tagStore.allTags = [TEST_TAG];
			tagStore.tagsById = {
				'test-tag': TEST_TAG,
			};
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([
				{
					id: '1',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					name: 'Test Workflow 1',
					active: false,
					versionId: 'c51247cf-52cf-40ec-9231-5d79bbcce244',
					tags: [],
					homeProject: {
						id: '1',
						type: 'team',
						name: 'Test Project',
						icon: { type: 'icon', value: 'folder-open' },
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
					nodes: [],
					connections: {} as IConnections,
					sharedWithProjects: [],
				},
				{
					id: '2',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					name: 'Test Workflow 2',
					active: false,
					versionId: 'c51247cf-52cf-40ec-9231-5d79bbcce244',
					tags: [{ id: 'test-tag', name: 'tag' }],
					homeProject: {
						id: '1',
						type: 'team',
						name: 'Test Project',
						icon: { type: 'icon', value: 'folder-open' },
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
					nodes: [],
					connections: {} as IConnections,
					sharedWithProjects: [],
				},
			] as IWorkflowDb[]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					tags: [TEST_TAG.name],
				}),
			);
		});

		it.skip('should set search filter based on query parameters', async () => {
			await router.replace({ query: { search: 'one' } });

			const pinia = createTestingPinia({ initialState });
			const workflowsStore = mockedStore(useWorkflowsStore);
			// workflowsStore.allWorkflows = [
			// 	{ id: '1', name: 'one' },
			// 	{ id: '2', name: 'two' },
			// ] as IWorkflowDb[];
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([
				{ id: '1', name: 'one' },
				{ id: '2', name: 'two' },
			] as IWorkflowDb[]);

			const { getAllByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
		});

		it.skip('should set status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'true' } });

			const pinia = createTestingPinia({ initialState });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allWorkflows = [
				{ id: '1', active: true },
				{ id: '2', active: false },
			] as IWorkflowDb[];

			const { getAllByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
		});

		it.skip('should reset filters', async () => {
			await router.replace({ query: { status: 'true' } });

			const pinia = createTestingPinia({ initialState });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.allWorkflows = [
				{ id: '1', active: true },
				{ id: '2', active: false },
			] as IWorkflowDb[];

			const { getAllByTestId, getByTestId } = renderComponent({ pinia });

			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(1));
			await waitFor(() => expect(getByTestId('workflows-filter-reset')).toBeInTheDocument());

			await userEvent.click(getByTestId('workflows-filter-reset'));
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(2));
		});

		it.skip('should remove incomplete properties', async () => {
			await router.replace({ query: { tags: '' } });
			const pinia = createTestingPinia({ initialState });
			renderComponent({ pinia });
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it.skip('should remove invalid tabs', async () => {
			await router.replace({ query: { tags: 'non-existing-tag' } });
			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [{ id: 'test-tag', name: 'tag' }];
			const pinia = createTestingPinia({ initialState });
			renderComponent({ pinia });
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});
	});

	it('should reinitialize on source control pullWorkfolder', async () => {
		vi.spyOn(usersApi, 'getUsers').mockResolvedValue([]);
		const pinia = createTestingPinia({ initialState, stubActions: false });
		const userStore = mockedStore(useUsersStore);
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchAllWorkflows.mockResolvedValue([]);
		workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

		const sourceControl = useSourceControlStore();

		renderComponent({ pinia });

		expect(userStore.fetchUsers).toHaveBeenCalledTimes(1);
		await sourceControl.pullWorkfolder(true);
		expect(userStore.fetchUsers).toHaveBeenCalledTimes(2);
	});
});
