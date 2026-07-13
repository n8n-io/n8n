import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { VIEWS } from '@/app/constants';
import type { WorkflowListResource } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useFoldersStore } from '@/features/core/folders/folders.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import WorkflowsView from '@/app/views/WorkflowsView.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';

vi.mock('@/features/collaboration/projects/projects.api');
vi.mock('@n8n/rest-api-client/api/users');
vi.mock('@/features/integrations/sourceControl.ee/sourceControl.api');
vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));
vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({
		isOverviewSubPage: false,
		isSharedSubPage: false,
	}),
}));
vi.mock('@/experiments/utils', async (importOriginal) => {
	const actual = await importOriginal<object>();

	return {
		...actual,
		isExtraTemplateLinksExperimentEnabled: vi.fn(() => true),
	};
});
const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
}));

const mockShowError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError }),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/:projectId?',
			component: { template: '<div></div>' },
		},
		{
			path: '/:projectId/folders/:folderId',
			component: { template: '<div></div>' },
		},
		{
			path: '/workflow',
			name: VIEWS.NEW_WORKFLOW,
			component: { template: '<div></div>' },
		},
		{
			path: '/templates',
			name: VIEWS.TEMPLATES,
			component: { template: '<div></div>' },
		},
	],
});

vi.mock('@n8n/rest-api-client/api/usage', () => ({
	getLicense: vi.fn(),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let foldersStore: ReturnType<typeof mockedStore<typeof useFoldersStore>>;
let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let projectPages: ReturnType<typeof useProjectPages>;

const renderComponent = createComponentRenderer(WorkflowsView, {
	global: {
		plugins: [router],
	},
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: { sharing: false, projects: { team: { limit: 5 } } },
			folders: { enabled: false },
		},
	},
};

describe('WorkflowsView', () => {
	beforeEach(async () => {
		await router.push('/');
		await router.isReady();
		pinia = createTestingPinia({ initialState });
		foldersStore = mockedStore(useFoldersStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		settingsStore = mockedStore(useSettingsStore);

		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);

		foldersStore.totalWorkflowCount = 0;
		foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);

		// Mock getSimplifiedLayoutVisibility to return false so ResourcesListLayout is used
		const readyToRunStore = mockedStore(useReadyToRunStore);
		vi.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility').mockReturnValue(false);

		projectPages = useProjectPages();
	});

	describe('should show empty state', () => {
		it('for non setup user', async () => {
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const emptyState = getByTestId('empty-resources-list');
			expect(within(emptyState).getByText('Create your first automation')).toBeVisible();
			expect(within(emptyState).getByRole('button', { name: 'Create workflow' })).toBeVisible();
		});

		it('should render empty state card regardless of user name', async () => {
			const userStore = mockedStore(useUsersStore);
			userStore.currentUser = { firstName: 'John' } as IUser;

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const emptyState = getByTestId('empty-resources-list');
			expect(within(emptyState).getByText('Create your first automation')).toBeVisible();
		});

		it('with the archived hint when all workflows are archived', async () => {
			foldersStore.totalWorkflowCount = 3;
			foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(3);

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('show-archived-link')).toBeVisible();
			const emptyState = getByTestId('empty-resources-list');
			expect(within(emptyState).getByText('Create your first automation')).toBeVisible();
		});

		describe('when onboardingExperiment -> False', () => {
			it('for readOnlyEnvironment', async () => {
				const sourceControl = mockedStore(useSourceControlStore);
				sourceControl.preferences.branchReadOnly = true;

				const { getByTestId } = renderComponent({ pinia });
				await waitAllPromises();

				const button = within(getByTestId('empty-resources-list')).getByRole('button', {
					name: 'Create workflow',
				});
				expect(button).toBeDisabled();
				sourceControl.preferences.branchReadOnly = false;
			});

			it('for noPermission', async () => {
				const { getByTestId } = renderComponent({ pinia });
				await waitAllPromises();

				const button = within(getByTestId('empty-resources-list')).getByRole('button', {
					name: 'Create workflow',
				});
				expect(button).toBeDisabled();
			});

			it('does not repeat generic prompt in fallback empty state', async () => {
				const projectsStore = mockedStore(useProjectsStore);
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

				const { getAllByText } = renderComponent({ pinia });
				await waitAllPromises();

				expect(getAllByText('Create your first automation')).toHaveLength(1);
			});

			it('for user with create scope', async () => {
				const projectsStore = mockedStore(useProjectsStore);
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

				const { getByTestId } = renderComponent({ pinia });
				await waitAllPromises();
				expect(
					within(getByTestId('empty-resources-list')).getByText('Create your first automation'),
				).toBeInTheDocument();
			});
		});
	});

	describe('fetch workflow options', () => {
		it('should not fetch folders for overview page', async () => {
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			settingsStore.isFoldersFeatureEnabled = true;
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.any(Object),
				false,
				expect.any(Boolean),
			);
		});

		it('should send proper API parameters for "Shared with you" page', async () => {
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			settingsStore.isFoldersFeatureEnabled = true;
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(true);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.any(Object),
				false, // No folders
				true, // onlySharedWithMe = true
			);
		});
	});

	describe('filters', () => {
		it('should set tag filter based on query parameters and not filter by parent folder', async () => {
			await router.replace({ query: { tags: 'test-tag' } });

			const TEST_TAG = { id: 'test-tag', name: 'tag' };

			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [TEST_TAG];
			tagStore.tagsById = {
				'test-tag': TEST_TAG,
			};
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					tags: [TEST_TAG.name],
					isArchived: false,
					parentFolderId: undefined,
				}),
				false, // No folders if tag filter is set
				expect.any(Boolean),
			);
		});

		it('should scope search to current folder when inside a folder', async () => {
			await router.replace({ path: '/project-1/folders/folder-1', query: { search: 'test' } });

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					query: 'test',
					parentFolderId: 'folder-1',
				}),
				expect.any(Boolean),
				expect.any(Boolean),
			);
		});

		it('should set search filter based on query parameters', async () => {
			await router.replace({ query: { search: 'one' } });

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					query: 'one',
					isArchived: false,
				}),
				expect.any(Boolean),
				expect.any(Boolean),
			);
		});

		it('should set active status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'true' } });

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					active: true,
					isArchived: false,
				}),
				false, // No folders if active filter is set
				expect.any(Boolean),
			);
		});

		it('should set deactivated status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'false' } });

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					active: false,
					isArchived: false,
				}),
				false,
				expect.any(Boolean),
			);
		});

		it('should unset isArchived filter based on query parameters', async () => {
			await router.replace({ query: { showArchived: 'true' } });

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsListStore.fetchWorkflowsPage).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Number),
				expect.any(Number),
				expect.any(String),
				expect.objectContaining({
					isArchived: undefined,
				}),
				false, // No folders if active filter is set
				expect.any(Boolean),
			);
		});

		it('should reset filters', async () => {
			await router.replace({ query: { status: 'true' } });

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);

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
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			renderComponent({ pinia });
			await waitAllPromises();
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it('should remove invalid tags', async () => {
			await router.replace({ query: { tags: 'non-existing-tag' } });
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [{ id: 'test-tag', name: 'tag' }];
			renderComponent({ pinia });
			await waitAllPromises();
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it('should show archived only hint', async () => {
			foldersStore.totalWorkflowCount = 1;
			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const showArchivedLink = getByTestId('show-archived-link');
			expect(showArchivedLink).toBeInTheDocument();

			await userEvent.click(showArchivedLink);
			expect(router.currentRoute.value.query).toStrictEqual({ showArchived: 'true' });
		});
	});

	describe('source control', () => {
		beforeEach(async () => {
			pinia = createTestingPinia({ initialState, stubActions: false });
			foldersStore = mockedStore(useFoldersStore);
			foldersStore.totalWorkflowCount = 0;
			foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);
			workflowsListStore = mockedStore(useWorkflowsListStore);

			workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);
		});
		it('should reinitialize on source control pullWorkfolder', async () => {
			vi.spyOn(usersApi, 'getUsers').mockResolvedValue({
				count: 0,
				items: [],
			});

			const sourceControl = useSourceControlStore();

			renderComponent({ pinia });
			await waitAllPromises();

			await sourceControl.pullWorkfolder(true, 'none');
		});
	});
});

describe('Folders', () => {
	beforeEach(async () => {
		await router.push('/');
		await router.isReady();
		pinia = createTestingPinia({ initialState });
		foldersStore = mockedStore(useFoldersStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		settingsStore = mockedStore(useSettingsStore);

		settingsStore.isFoldersFeatureEnabled = true;
		projectPages = useProjectPages();
	});

	const TEST_WORKFLOW_RESOURCE: WorkflowListResource = {
		resource: 'workflow',
		id: '1',
		name: 'Workflow 1',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		active: true,
		activeVersionId: 'v1',
		isArchived: false,
		versionId: '1',
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
		subFolderCount: 0,
		homeProject: {
			id: '1',
			name: 'Project 1',
			icon: null,
			type: 'team',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	};

	it('should render workflow and folder cards', async () => {
		// mock router resolve:
		router.resolve = vi.fn().mockResolvedValue({
			href: '/projects/1/folders/1',
		});
		foldersStore.totalWorkflowCount = 2;
		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([
			TEST_WORKFLOW_RESOURCE,
			TEST_FOLDER_RESOURCE,
		]);
		workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);
		const { getByTestId } = renderComponent({
			pinia,
		});
		await waitAllPromises();
		expect(getByTestId('resources-list-wrapper')).toBeInTheDocument();
		expect(getByTestId('resources-list-wrapper').querySelectorAll('.listItem')).toHaveLength(2);
		expect(getByTestId('workflow-card-name')).toHaveTextContent(TEST_WORKFLOW_RESOURCE.name);
		expect(getByTestId('folder-card-name')).toHaveTextContent(TEST_FOLDER_RESOURCE.name);
	});

	it('should show folder actions menu when not in the overview or sharing pages', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProject = {
			id: '1',
			name: 'Project 1',
			type: 'team',
			scopes: ['folder:create'],
		} as Project;

		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([TEST_WORKFLOW_RESOURCE]);
		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
		});
		await waitAllPromises();

		expect(queryByTestId('add-folder-button')).not.toBeInTheDocument();
		expect(getByTestId('folder-breadcrumbs-actions')).toBeInTheDocument();
	});

	it('should NOT show standalone "Create folder" button when in overview subpage', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);

		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([TEST_WORKFLOW_RESOURCE]);
		const { queryByTestId } = renderComponent({
			pinia,
		});
		await waitAllPromises();

		expect(queryByTestId('add-folder-button')).not.toBeInTheDocument();
	});

	it('should NOT show standalone "Create folder" button when in shared subpage', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(true);

		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([TEST_WORKFLOW_RESOURCE]);
		const { queryByTestId } = renderComponent({
			pinia,
		});
		await waitAllPromises();

		expect(queryByTestId('add-folder-button')).not.toBeInTheDocument();
	});
});

describe('Simplified Layout', () => {
	beforeEach(async () => {
		localStorage.clear();
		await router.push('/');
		await router.isReady();
		pinia = createTestingPinia({ initialState });
		foldersStore = mockedStore(useFoldersStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);
		foldersStore.totalWorkflowCount = 0;
		foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);
	});

	it('should render EmptyStateLayout when simplified layout is enabled', async () => {
		const readyToRunStore = mockedStore(useReadyToRunStore);
		const projectsStore = mockedStore(useProjectsStore);

		vi.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility').mockReturnValue(true);
		projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

		const { queryByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		// ResourcesListLayout should NOT be rendered when simplified layout is enabled
		expect(queryByTestId('resources-list-wrapper')).not.toBeInTheDocument();
	});

	it('should navigate to new workflow when Create workflow card is clicked', async () => {
		const readyToRunStore = mockedStore(useReadyToRunStore);
		const projectsStore = mockedStore(useProjectsStore);

		vi.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility').mockReturnValue(true);
		projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

		const { getByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		const createWorkflowCard = getByTestId('new-workflow-card');
		expect(createWorkflowCard).toBeInTheDocument();

		await userEvent.click(createWorkflowCard);

		expect(router.currentRoute.value.name).toBe(VIEWS.NEW_WORKFLOW);
	});

	it('should render ResourcesListLayout when simplified layout is disabled', async () => {
		const readyToRunStore = mockedStore(useReadyToRunStore);
		vi.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility').mockReturnValue(false);

		const { queryByTestId } = renderComponent({ pinia });
		await waitAllPromises();

		expect(queryByTestId('empty-resources-list')).toBeInTheDocument();
	});

	it('fetches credentials for empty-state detection when there are no workflows', async () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		projectPages = useProjectPages();
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
		foldersStore.totalWorkflowCount = 0;

		renderComponent({ pinia });
		await waitAllPromises();

		expect(credentialsStore.fetchAllCredentials).toHaveBeenCalled();
	});

	it('shows a toast when empty-state resource fetches fail', async () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		projectPages = useProjectPages();
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
		foldersStore.totalWorkflowCount = 0;
		credentialsStore.fetchAllCredentials = vi.fn().mockRejectedValue(new Error('Network error'));

		renderComponent({ pinia });
		await waitAllPromises();

		expect(mockShowError).toHaveBeenCalled();
	});

	it('skips the empty-state resource fetches when stores already show workflows exist', async () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		projectPages = useProjectPages();
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
		foldersStore.totalWorkflowCount = 5;

		renderComponent({ pinia });
		await waitAllPromises();

		expect(credentialsStore.fetchAllCredentials).not.toHaveBeenCalled();
	});

	it('should call getSimplifiedLayoutVisibility with route and loading state', async () => {
		const readyToRunStore = mockedStore(useReadyToRunStore);
		const getSimplifiedLayoutVisibility = vi
			.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility')
			.mockReturnValue(false);

		renderComponent({ pinia });
		await waitAllPromises();

		// Should be called with route and loading boolean
		expect(getSimplifiedLayoutVisibility).toHaveBeenCalled();
		const callArgs = getSimplifiedLayoutVisibility.mock.calls[0];
		expect(callArgs[0]).toBeDefined(); // route
	});

	it('should pass route and loading state reactively to getSimplifiedLayoutVisibility', async () => {
		const readyToRunStore = mockedStore(useReadyToRunStore);
		const getSimplifiedLayoutVisibility = vi
			.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility')
			.mockReturnValue(false);

		renderComponent({ pinia });
		await waitAllPromises();

		const initialCallCount = getSimplifiedLayoutVisibility.mock.calls.length;
		expect(initialCallCount).toBeGreaterThan(0);

		// The computed should be called with the current route and loading state
		const lastCall = getSimplifiedLayoutVisibility.mock.calls[initialCallCount - 1];
		expect(lastCall[0]).toHaveProperty('params'); // route object
	});
});

describe('onboarding loading state', () => {
	beforeEach(async () => {
		localStorage.clear();
		await router.push('/');
		await router.isReady();
		pinia = createTestingPinia({ initialState });
		foldersStore = mockedStore(useFoldersStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		workflowsListStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsListStore.fetchActiveWorkflows.mockResolvedValue([]);
		foldersStore.totalWorkflowCount = 0;
		foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);

		const readyToRunStore = mockedStore(useReadyToRunStore);
		vi.spyOn(readyToRunStore, 'getSimplifiedLayoutVisibility').mockReturnValue(false);

		projectPages = useProjectPages();
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
	});

	it('shows neutral loading instead of list chrome on overview while instance content is unknown', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('workflows-onboarding-loading')).toBeInTheDocument();
		expect(queryByTestId('add-resource-buttons')).not.toBeInTheDocument();

		await waitAllPromises();
	});

	it('keeps list chrome during load when stores already show instance content', async () => {
		foldersStore.totalWorkflowCount = 5;
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('workflows-onboarding-loading')).not.toBeInTheDocument();
		expect(getByTestId('add-resource-buttons')).toBeInTheDocument();

		await waitAllPromises();
	});

	it('re-arms the deferred loading state when navigating between surfaces', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		await waitAllPromises();
		expect(queryByTestId('workflows-onboarding-loading')).not.toBeInTheDocument();

		await router.push('/some-project');
		await nextTick();

		expect(getByTestId('workflows-onboarding-loading')).toBeInTheDocument();

		await waitAllPromises();
		expect(queryByTestId('workflows-onboarding-loading')).not.toBeInTheDocument();
	});
});
