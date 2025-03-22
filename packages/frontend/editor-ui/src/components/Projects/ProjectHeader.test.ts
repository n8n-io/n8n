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

describe('ProjectHeader', () => {
	beforeEach(() => {
		createTestingPinia();
		route = router.useRoute();
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);

		projectsStore.teamProjectsLimit = -1;
		settingsStore.settings.folders = { enabled: false };
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render the correct title and subtitle', async () => {
		const { getByText, queryByText, rerender } = renderComponent();
		const subtitle = 'All the workflows, credentials and executions you have access to';

		expect(getByText('Overview')).toBeVisible();
		expect(getByText(subtitle)).toBeVisible();

		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;
		await rerender({});
		expect(getByText('Personal')).toBeVisible();
		expect(queryByText(subtitle)).not.toBeInTheDocument();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;
		await rerender({});
		expect(getByText(projectName)).toBeVisible();
		expect(queryByText(subtitle)).not.toBeInTheDocument();
	});

	it('should overwrite default subtitle with slot', () => {
		const defaultSubtitle = 'All the workflows, credentials and executions you have access to';
		const subtitle = 'Custom subtitle';

		const { getByText, queryByText } = renderComponent({
			slots: {
				subtitle,
			},
		});

		expect(getByText(subtitle)).toBeVisible();
		expect(queryByText(defaultSubtitle)).not.toBeInTheDocument();
	});

	it('should render ProjectTabs Settings if project is team project and user has update scope', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = createTestProject({ scopes: ['project:update'] });
		renderComponent();

		expect(projectTabsSpy).toHaveBeenCalledWith(
			{
				'show-settings': true,
			},
			null,
		);
	});

	it('should render ProjectTabs without Settings if no project update permission', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = createTestProject({ scopes: ['project:read'] });
		renderComponent();

		expect(projectTabsSpy).toHaveBeenCalledWith(
			{
				'show-settings': false,
			},
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
			{
				'show-settings': false,
			},
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
