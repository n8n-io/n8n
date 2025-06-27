import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestProject } from '@/__tests__/data/projects';
import * as router from 'vue-router';
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { useProjectsStore } from '@/stores/projects.store';
import type { Project } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import { VIEWS } from '@/constants';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useProjectPages } from '@/composables/useProjectPages';

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

vi.mock('@/composables/useProjectPages', () => ({
	useProjectPages: vi.fn().mockReturnValue({
		isOverviewSubPage: false,
		isSharedSubPage: false,
		isProjectsSubPage: false,
	}),
}));

const projectTabsSpy = vi.fn().mockReturnValue({
	render: vi.fn(),
});

const renderComponent = createComponentRenderer(ProjectHeader, {
	global: {
		stubs: {
			ProjectTabs: projectTabsSpy,
		},
	},
});

let route: ReturnType<typeof router.useRoute>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let projectPages: ReturnType<typeof useProjectPages>;

describe('ProjectHeader', () => {
	beforeEach(() => {
		createTestingPinia();
		route = router.useRoute();
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		projectPages = useProjectPages();

		projectsStore.teamProjectsLimit = -1;
		settingsStore.settings.folders = { enabled: false };
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
		projectsStore.currentProject = createTestProject({ scopes: ['project:update'] });
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
		projectsStore.currentProject = createTestProject({ scopes: ['project:read'] });
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

			expect(mockPush).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: {
					projectId: project.id,
					credentialId: 'create',
				},
			});
		});
	});

	it('should not render creation button in setting page', async () => {
		projectsStore.currentProject = createTestProject({ type: ProjectTypes.Personal });
		vi.spyOn(router, 'useRoute').mockReturnValueOnce({
			name: VIEWS.PROJECT_SETTINGS,
		} as RouteLocationNormalizedLoadedGeneric);
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('add-resource-buttons')).not.toBeInTheDocument();
	});
});
