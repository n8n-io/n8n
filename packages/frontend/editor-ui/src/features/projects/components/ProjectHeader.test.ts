import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestProject } from '../__tests__/utils';
import * as router from 'vue-router';
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router';
import ProjectHeader from './ProjectHeader.vue';
import { useProjectsStore } from '../projects.store';
import type { Project } from '../projects.types';
import { ProjectTypes } from '../projects.types';
import { VIEWS } from '@/constants';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useProjectPages } from '@/features/projects/composables/useProjectPages';
import { useUIStore } from '@/stores/ui.store';

const mockPush = vi.fn();
vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	const location = {};
	return {
		...actual,
		useRouter: () => ({
			push: mockPush,
		}),
		useRoute: () => ({
			params,
			location,
		}),
	};
});

vi.mock('@/features/projects/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({
		isOverviewSubPage: false,
		isSharedSubPage: false,
		isProjectsSubPage: false,
	}),
}));

const projectTabsSpy = vi.fn().mockReturnValue({
	render: vi.fn(),
});

const ProjectCreateResourceStub = {
	props: {
		actions: Array,
	},
	template: `
		<div>
			<div data-test-id="add-resource"><button role="button"></button></div>
			<button data-test-id="add-resource-workflow" @click="$emit('action', 'workflow')">Workflow</button>
			<button data-test-id="action-credential" @click="$emit('action', 'credential')">Credentials</button>
			<div data-test-id="add-resource-actions" >
				<button v-for="action in $props.actions" :key="action.value"></button>
			</div>
		</div>
	`,
};

const renderComponent = createComponentRenderer(ProjectHeader, {
	global: {
		stubs: {
			ProjectTabs: projectTabsSpy,
			ProjectCreateResource: ProjectCreateResourceStub,
		},
	},
});

let route: ReturnType<typeof router.useRoute>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
let projectPages: ReturnType<typeof useProjectPages>;

describe('ProjectHeader', () => {
	beforeEach(() => {
		createTestingPinia();
		route = router.useRoute();
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);
		projectPages = useProjectPages();

		projectsStore.teamProjectsLimit = -1;
		settingsStore.settings.folders = { enabled: false };
		settingsStore.isDataTableFeatureEnabled = true;

		// Setup default moduleTabs structure
		uiStore.moduleTabs = {
			shared: {},
			overview: {},
			project: {},
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should not render title icon on overview page', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
		const { container } = renderComponent();

		expect(container.querySelector('svg[data-icon=home]')).not.toBeInTheDocument();
	});

	it('should render the correct icon', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		const { container, rerender } = renderComponent();

		// We no longer render icon for personal project
		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;
		await rerender({});
		expect(container.querySelector('svg[data-icon=user]')).not.toBeInTheDocument();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;
		await rerender({});
		expect(container.querySelector('svg[data-icon=layers]')).toBeVisible();
	});

	it('Overview: should render the correct title and subtitle', async () => {
		settingsStore.isDataTableFeatureEnabled = false;
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);
		const { getByTestId, rerender } = renderComponent();
		const overviewSubtitle = 'All the workflows, credentials and executions you have access to';

		await rerender({});

		expect(getByTestId('project-name')).toHaveTextContent('Overview');
		expect(getByTestId('project-subtitle')).toHaveTextContent(overviewSubtitle);
	});

	it('Shared with you: should render the correct title and subtitle', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(true);
		const { getByTestId, rerender } = renderComponent();
		const sharedSubtitle = 'Workflows and credentials other users have shared with you';

		await rerender({});

		expect(getByTestId('project-name')).toHaveTextContent('Shared with you');
		expect(getByTestId('project-subtitle')).toHaveTextContent(sharedSubtitle);
	});

	it('Personal: should render the correct title and subtitle', async () => {
		settingsStore.isDataTableFeatureEnabled = false;
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
		const { getByTestId, rerender } = renderComponent();
		const personalSubtitle = 'Workflows and credentials owned by you';

		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;

		await rerender({});

		expect(getByTestId('project-name')).toHaveTextContent('Personal');
		expect(getByTestId('project-subtitle')).toHaveTextContent(personalSubtitle);
	});

	it('Team project: should render the correct title and no subtitle if there is no description', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isProjectsSubPage', 'get').mockReturnValue(true);
		const { getByTestId, queryByTestId, rerender } = renderComponent();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;

		await rerender({});

		expect(getByTestId('project-name')).toHaveTextContent(projectName);
		expect(queryByTestId('project-subtitle')).not.toBeInTheDocument();
	});

	it('Team project: should render the correct title and subtitle if there is a description', async () => {
		vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
		vi.spyOn(projectPages, 'isProjectsSubPage', 'get').mockReturnValue(true);
		const { getByTestId, rerender } = renderComponent();

		const projectName = 'My Project';
		const projectDescription = 'This is a team project description';
		projectsStore.currentProject = {
			name: projectName,
			description: projectDescription,
		} as Project;

		await rerender({});

		expect(getByTestId('project-name')).toHaveTextContent(projectName);
		expect(getByTestId('project-subtitle')).toHaveTextContent(projectDescription);
	});

	it('should render ProjectTabs Settings if project is team project and user has update scope', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = createTestProject({
			scopes: ['project:update'],
		});
		renderComponent();

		expect(projectTabsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				'show-settings': true,
			}),
			null,
		);
	});

	it('should render ProjectTabs without Settings if no project update permission', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = createTestProject({
			scopes: ['project:read'],
		});
		renderComponent();

		expect(projectTabsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				'show-settings': false,
			}),
			null,
		);
	});

	it('should render ProjectTabs without Settings if project is not team project', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = createTestProject({
			type: ProjectTypes.Personal,
			scopes: ['project:update'],
		});
		renderComponent();

		expect(projectTabsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				'show-settings': false,
			}),
			null,
		);
	});

	it('should create a workflow', async () => {
		const project = createTestProject({
			scopes: ['workflow:create'],
		});
		projectsStore.currentProject = project;

		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('add-resource-workflow'));

		expect(mockPush).toHaveBeenCalledWith({
			name: VIEWS.NEW_WORKFLOW,
			query: { projectId: project.id },
		});
	});

	describe('dropdown', () => {
		it('should create a credential', async () => {
			const project = createTestProject({
				scopes: ['credential:create'],
			});
			projectsStore.currentProject = project;

			const { getByTestId } = renderComponent();

			await userEvent.click(within(getByTestId('add-resource')).getByRole('button'));

			await waitFor(() => expect(getByTestId('action-credential')).toBeVisible());

			await userEvent.click(getByTestId('action-credential'));

			expect(mockPush).toHaveBeenCalledWith(
				expect.objectContaining({
					name: VIEWS.PROJECTS_CREDENTIALS,
					params: {
						projectId: project.id,
						credentialId: 'create',
					},
				}),
			);
		});
	});

	it('should not render creation button in setting page', async () => {
		projectsStore.currentProject = createTestProject({
			type: ProjectTypes.Personal,
		});
		vi.spyOn(router, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECT_SETTINGS,
		} as RouteLocationNormalizedLoadedGeneric);
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('add-resource-buttons')).not.toBeInTheDocument();
	});

	describe('customProjectTabs', () => {
		it('should pass tabs for shared page type when on shared sub page', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(true);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);

			const mockTabs = [
				{ value: 'shared-tab-1', label: 'Shared Tab 1' },
				{ value: 'shared-tab-2', label: 'Shared Tab 2' },
			];

			uiStore.moduleTabs.shared = {
				module1: mockTabs,
				module2: [],
			};

			settingsStore.isModuleActive = vi
				.fn()
				.mockReturnValueOnce(true) // module1 is active
				.mockReturnValueOnce(false); // module2 is inactive

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': mockTabs,
				}),
				null,
			);
		});

		it('should pass tabs for overview page type when on overview sub page', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(true);

			const mockTabs = [{ value: 'overview-tab-1', label: 'Overview Tab 1' }];

			uiStore.moduleTabs.overview = {
				overviewModule: mockTabs,
			};

			settingsStore.isModuleActive = vi.fn().mockReturnValue(true);

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': mockTabs,
				}),
				null,
			);
		});

		it('should pass tabs for project page type when not on shared or overview sub pages', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);

			const mockTabs = [
				{ value: 'project-tab-1', label: 'Project Tab 1' },
				{ value: 'project-tab-2', label: 'Project Tab 2' },
			];

			uiStore.moduleTabs.project = {
				projectModule: mockTabs,
			};

			settingsStore.isModuleActive = vi.fn().mockReturnValue(true);

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': mockTabs,
				}),
				null,
			);
		});

		it('should filter out tabs from inactive modules', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);

			const activeTabs = [{ value: 'active-tab', label: 'Active Tab' }];
			const inactiveTabs = [{ value: 'inactive-tab', label: 'Inactive Tab' }];

			uiStore.moduleTabs.project = {
				activeModule: activeTabs,
				inactiveModule: inactiveTabs,
			};

			settingsStore.isModuleActive = vi
				.fn()
				.mockImplementation((module: string) => module === 'activeModule');

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': activeTabs,
				}),
				null,
			);
		});

		it('should flatten tabs from multiple active modules', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);

			const module1Tabs = [
				{ value: 'module1-tab1', label: 'Module 1 Tab 1' },
				{ value: 'module1-tab2', label: 'Module 1 Tab 2' },
			];
			const module2Tabs = [{ value: 'module2-tab1', label: 'Module 2 Tab 1' }];

			uiStore.moduleTabs.project = {
				module1: module1Tabs,
				module2: module2Tabs,
				module3: [], // Empty tabs array
			};

			settingsStore.isModuleActive = vi.fn().mockReturnValue(true);

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': [...module1Tabs, ...module2Tabs],
				}),
				null,
			);
			expect(settingsStore.isModuleActive).toHaveBeenCalledTimes(3);
		});

		it('should pass empty array when no modules are active', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);

			uiStore.moduleTabs.project = {
				module1: [{ value: 'tab1', label: 'Tab 1' }],
				module2: [{ value: 'tab2', label: 'Tab 2' }],
			};

			settingsStore.isModuleActive = vi.fn().mockReturnValue(false);

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': [],
				}),
				null,
			);
		});

		it('should pass empty array when no modules exist for the tab type', () => {
			vi.spyOn(projectPages, 'isSharedSubPage', 'get').mockReturnValue(false);
			vi.spyOn(projectPages, 'isOverviewSubPage', 'get').mockReturnValue(false);

			uiStore.moduleTabs.project = {}; // No modules

			renderComponent();

			expect(projectTabsSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					'additional-tabs': [],
				}),
				null,
			);
		});
	});

	describe('ProjectCreateResource', () => {
		it('should render menu items', () => {
			const { getByTestId } = renderComponent();
			const actionsContainer = getByTestId('add-resource-actions');
			expect(actionsContainer).toBeInTheDocument();
			expect(actionsContainer.children).toHaveLength(2);
		});

		it('should not render dataTable menu item if data table feature is disabled', () => {
			settingsStore.isDataTableFeatureEnabled = false;
			const { getByTestId } = renderComponent();
			const actionsContainer = getByTestId('add-resource-actions');
			expect(actionsContainer).toBeInTheDocument();
			expect(actionsContainer.children).toHaveLength(1);
		});
	});
});
