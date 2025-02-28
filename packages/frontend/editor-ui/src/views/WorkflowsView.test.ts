import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { useUsersStore } from '@/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '@/stores/projects.store';
import { createTestingPinia } from '@pinia/testing';
import { STORES, VIEWS } from '@/constants';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import type { IUser, WorkflowListResource } from '@/Interface';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { Project } from '@/types/projects.types';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useTagsStore } from '@/stores/tags.store';
import { createRouter, createWebHistory } from 'vue-router';
import * as usersApi from '@/api/users';

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

let pinia: ReturnType<typeof createTestingPinia>;

const renderComponent = createComponentRenderer(WorkflowsView, {
	global: {
		plugins: [router],
	},
});

const initialState = {
	[STORES.SETTINGS]: { settings: { enterprise: { sharing: false }, folders: { enabled: false } } },
};

describe('WorkflowsView', () => {
	beforeEach(async () => {
		await router.push('/');
		await router.isReady();
		pinia = createTestingPinia({ initialState });
	});

	describe('should show empty state', () => {
		it('for non setup user', async () => {
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);
			const { getByText } = renderComponent({ pinia });
			await waitAllPromises();
			expect(getByText('👋 Welcome!')).toBeVisible();
		});

		it('for currentUser user', async () => {
			const userStore = mockedStore(useUsersStore);
			userStore.currentUser = { firstName: 'John' } as IUser;

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

			const { getByText } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByText('👋 Welcome John!')).toBeVisible();
		});

		describe('when onboardingExperiment -> False', () => {
			beforeEach(() => {
				pinia = createTestingPinia({ initialState });
			});

			it('for readOnlyEnvironment', async () => {
				const sourceControl = mockedStore(useSourceControlStore);
				sourceControl.preferences.branchReadOnly = true;

				const workflowsStore = mockedStore(useWorkflowsStore);
				workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
				workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

				const { getByText } = renderComponent({ pinia });
				await waitAllPromises();

				expect(getByText('No workflows here yet')).toBeInTheDocument();
				sourceControl.preferences.branchReadOnly = false;
			});

			it('for noPermission', async () => {
				const workflowsStore = mockedStore(useWorkflowsStore);
				workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
				workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

				const { getByText } = renderComponent({ pinia });
				await waitAllPromises();
				expect(getByText('There are currently no workflows to view')).toBeInTheDocument();
			});

			it('for user with create scope', async () => {
				const projectsStore = mockedStore(useProjectsStore);
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;
				const workflowsStore = mockedStore(useWorkflowsStore);
				workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
				workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

				const { getByText } = renderComponent({ pinia });
				await waitAllPromises();
				expect(getByText('Create your first workflow')).toBeInTheDocument();
			});
		});

		it('should allow workflow creation', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('new-workflow-card')).toBeInTheDocument();

			await userEvent.click(getByTestId('new-workflow-card'));

			expect(router.currentRoute.value.name).toBe(VIEWS.NEW_WORKFLOW);
		});
	});

	describe('filters', () => {
		beforeEach(async () => {
			pinia = createTestingPinia({ initialState });
		});

		it('should set tag filter based on query parameters', async () => {
			await router.replace({ query: { tags: 'test-tag' } });

			const TEST_TAG = { id: 'test-tag', name: 'tag' };

			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [TEST_TAG];
			tagStore.tagsById = {
				'test-tag': TEST_TAG,
			};
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);

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
				expect.any(Boolean),
			);
		});

		it('should set search filter based on query parameters', async () => {
			await router.replace({ query: { search: 'one' } });

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					name: 'one',
				}),
				expect.any(Boolean),
			);
		});

		it('should set status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'true' } });

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					active: true,
				}),
				expect.any(Boolean),
			);
		});

		it('should reset filters', async () => {
			await router.replace({ query: { status: 'true' } });

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);

			const { queryByTestId, getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('workflows-filter-reset')).toBeInTheDocument();
			// Should show the filter count
			expect(getByTestId('resources-list-filters-count')).toHaveTextContent('1');

			// Reset filters
			await userEvent.click(getByTestId('workflows-filter-reset'));
			// Should hide the filter count
			expect(queryByTestId('resources-list-filters-count')).not.toBeInTheDocument();
		});

		it('should remove incomplete properties', async () => {
			await router.replace({ query: { tags: '' } });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			renderComponent({ pinia });
			await waitAllPromises();
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it('should remove invalid tags', async () => {
			await router.replace({ query: { tags: 'non-existing-tag' } });
			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [{ id: 'test-tag', name: 'tag' }];
			renderComponent({ pinia });
			await waitAllPromises();
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});
	});

	it('should reinitialize on source control pullWorkfolder', async () => {
		vi.spyOn(usersApi, 'getUsers').mockResolvedValue([]);
		pinia = createTestingPinia({ initialState, stubActions: false });
		const userStore = mockedStore(useUsersStore);
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

		const sourceControl = useSourceControlStore();

		renderComponent({ pinia });

		await sourceControl.pullWorkfolder(true);
		expect(userStore.fetchUsers).toHaveBeenCalledTimes(2);
	});

	it('should render workflow and folder cards', async () => {
		const TEST_WORKFLOW_RESOURCE: WorkflowListResource = {
			resource: 'workflow',
			id: '1',
			name: 'Workflow 1',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			active: true,
			homeProject: {
				id: '1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};
		const TEST_FOLDER_RESOURCE: WorkflowListResource = {
			resource: 'folder',
			id: '2',
			name: 'Folder 2',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			workflowCount: 1,
			homeProject: {
				id: '1',
				name: 'Project 1',
				icon: null,
				type: 'team',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};
		// mock router resolve:
		router.resolve = vi.fn().mockResolvedValue({
			href: '/projects/1/folders/1',
		});
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchWorkflowsPage.mockResolvedValue([
			TEST_WORKFLOW_RESOURCE,
			TEST_FOLDER_RESOURCE,
		]);
		workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);
		const { getByTestId } = renderComponent({
			pinia,
			global: {
				stubs: {
					'router-link': {
						template: '<div data-test-id="folder-card"><slot /></div>',
					},
				},
			},
		});
		await waitAllPromises();
		expect(getByTestId('resources-list-wrapper')).toBeInTheDocument();
		expect(getByTestId('resources-list-wrapper').querySelectorAll('.listItem')).toHaveLength(2);
		expect(getByTestId('workflow-card-name')).toHaveTextContent(TEST_WORKFLOW_RESOURCE.name);
		expect(getByTestId('folder-card-name')).toHaveTextContent(TEST_FOLDER_RESOURCE.name);
	});
});
