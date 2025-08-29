import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useProjectPages } from '@/composables/useProjectPages';
import { VIEWS } from '@/constants';
import type { WorkflowListResource } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { Project } from '@/types/projects.types';
import { TemplateClickSource } from '@/utils/experiments';
import WorkflowsView from '@/views/WorkflowsView.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('@/api/projects.api');
vi.mock('@n8n/rest-api-client/api/users');
vi.mock('@/api/sourceControl');
vi.mock('@/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));
vi.mock('@/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({
		isOverviewSubPage: false,
		isSharedSubPage: false,
	}),
}));
vi.mock('@/utils/experiments', async (importOriginal) => {
	const actual = await importOriginal<object>();

	return {
		...actual,
		isExtraTemplateLinksExperimentEnabled: vi.fn(() => true),
	};
});
const mockTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: mockTrack,
	})),
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
		{
			path: '/templates',
			name: VIEWS.TEMPLATES,
			component: { template: '<div></div>' },
		},
	],
});

vi.mock('@/api/usage', () => ({
	getLicense: vi.fn(),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let foldersStore: ReturnType<typeof mockedStore<typeof useFoldersStore>>;
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
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
		workflowsStore = mockedStore(useWorkflowsStore);
		settingsStore = mockedStore(useSettingsStore);

		workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
		workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);

		foldersStore.totalWorkflowCount = 0;
		foldersStore.fetchTotalWorkflowsAndFoldersCount.mockResolvedValue(0);

		projectPages = useProjectPages();
	});

	describe('should show empty state', () => {
		it('for non setup user', async () => {
			const { getByText } = renderComponent({ pinia });
			await waitAllPromises();
			expect(getByText('👋 Welcome!')).toBeVisible();
		});

		it('for currentUser user', async () => {
			const userStore = mockedStore(useUsersStore);
			userStore.currentUser = { firstName: 'John' } as IUser;

			const { getByText } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByText('👋 Welcome John!')).toBeVisible();
		});

		describe('when onboardingExperiment -> False', () => {
			it('for readOnlyEnvironment', async () => {
				const sourceControl = mockedStore(useSourceControlStore);
				sourceControl.preferences.branchReadOnly = true;

				const { getByText } = renderComponent({ pinia });
				await waitAllPromises();

				expect(getByText('No workflows here yet')).toBeInTheDocument();
				sourceControl.preferences.branchReadOnly = false;
			});

			it('for noPermission', async () => {
				const { getByText } = renderComponent({ pinia });
				await waitAllPromises();
				expect(getByText('There are currently no workflows to view')).toBeInTheDocument();
			});

			it('for user with create scope', async () => {
				const projectsStore = mockedStore(useProjectsStore);
				projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

				const { getByText } = renderComponent({ pinia });
				await waitAllPromises();
				expect(getByText('Create your first workflow')).toBeInTheDocument();
			});
		});

		it('should allow workflow creation', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('new-workflow-card')).toBeInTheDocument();

			await userEvent.click(getByTestId('new-workflow-card'));

			expect(router.currentRoute.value.name).toBe(VIEWS.NEW_WORKFLOW);
		});

		it('should show template card', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

			settingsStore.settings.templates = { enabled: true, host: 'http://example.com' };
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			expect(getByTestId('new-workflow-from-template-card')).toBeInTheDocument();
		});

		it('should track template card click', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = { scopes: ['workflow:create'] } as Project;

			settingsStore.settings.templates = { enabled: true, host: 'http://example.com' };
			const { getByTestId } = renderComponent({ pinia });
			await waitAllPromises();

			const card = getByTestId('new-workflow-from-template-card');
			await userEvent.click(card);

			expect(mockTrack).toHaveBeenCalledWith(
				'User clicked on templates',
				expect.objectContaining({
					source: TemplateClickSource.emptyInstanceCard,
				}),
			);
		});
	});

	describe('fetch workflow options', () => {
		it('should not fetch folders for overview page', async () => {
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			settingsStore.isFoldersFeatureEnabled = true;
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
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
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			settingsStore.isFoldersFeatureEnabled = true;
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(true);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
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
		it('should set tag filter based on query parameters', async () => {
			await router.replace({ query: { tags: 'test-tag' } });

			const TEST_TAG = { id: 'test-tag', name: 'tag' };

			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [TEST_TAG];
			tagStore.tagsById = {
				'test-tag': TEST_TAG,
			};
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
					isArchived: false,
				}),
				false, // No folders if tag filter is set
				expect.any(Boolean),
			);
		});

		it('should set search filter based on query parameters', async () => {
			await router.replace({ query: { search: 'one' } });

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
					isArchived: false,
				}),
				expect.any(Boolean),
				expect.any(Boolean),
			);
		});

		it('should set active status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'true' } });

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
					isArchived: false,
				}),
				false, // No folders if active filter is set
				expect.any(Boolean),
			);
		});

		it('should set deactivated status filter based on query parameters', async () => {
			await router.replace({ query: { status: 'false' } });

			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
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

			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);

			renderComponent({ pinia });
			await waitAllPromises();

			expect(workflowsStore.fetchWorkflowsPage).toHaveBeenCalledWith(
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
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			renderComponent({ pinia });
			await waitAllPromises();
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it('should remove invalid tags', async () => {
			await router.replace({ query: { tags: 'non-existing-tag' } });
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			const tagStore = mockedStore(useTagsStore);
			tagStore.allTags = [{ id: 'test-tag', name: 'tag' }];
			renderComponent({ pinia });
			await waitAllPromises();
			await waitFor(() => expect(router.currentRoute.value.query).toStrictEqual({}));
		});

		it('should show archived only hint', async () => {
			foldersStore.totalWorkflowCount = 1;
			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
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
			workflowsStore = mockedStore(useWorkflowsStore);

			workflowsStore.fetchWorkflowsPage.mockResolvedValue([]);
			workflowsStore.fetchActiveWorkflows.mockResolvedValue([]);
		});
		it('should reinitialize on source control pullWorkfolder', async () => {
			vi.spyOn(usersApi, 'getUsers').mockResolvedValue({
				count: 0,
				items: [],
			});
			const userStore = mockedStore(useUsersStore);

			const sourceControl = useSourceControlStore();

			renderComponent({ pinia });

			await sourceControl.pullWorkfolder(true);
			expect(userStore.fetchUsers).toHaveBeenCalledTimes(2);
		});
	});
});

describe('Folders', () => {
	beforeEach(async () => {
		await router.push('/');
		await router.isReady();
		pinia = createTestingPinia({ initialState });
		foldersStore = mockedStore(useFoldersStore);
		workflowsStore = mockedStore(useWorkflowsStore);
	});

	const TEST_WORKFLOW_RESOURCE: WorkflowListResource = {
		resource: 'workflow',
		id: '1',
		name: 'Workflow 1',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		active: true,
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
