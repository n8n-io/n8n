import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/dom';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestProject } from '@/__tests__/data/projects';
import { useRoute } from 'vue-router';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { useProjectsStore } from '@/stores/projects.store';
import type { Project } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	const location = {};
	return {
		...actual,
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
			N8nNavigationDropdown: true,
		},
	},
});

let route: ReturnType<typeof useRoute>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

describe('ProjectHeader', () => {
	beforeEach(() => {
		createTestingPinia();
		route = useRoute();
		projectsStore = mockedStore(useProjectsStore);

		projectsStore.teamProjectsLimit = -1;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render the correct icon', async () => {
		const { container, rerender } = renderComponent();

		expect(container.querySelector('.fa-home')).toBeVisible();

		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;
		await rerender({});
		expect(container.querySelector('.fa-user')).toBeVisible();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;
		await rerender({});
		expect(container.querySelector('.fa-layer-group')).toBeVisible();
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

	test.each([
		[null, 'Create'],
		[createTestProject({ type: ProjectTypes.Personal }), 'Create in personal'],
		[createTestProject({ type: ProjectTypes.Team }), 'Create in project'],
	])('in project %s should render correct create button label %s', (project, label) => {
		projectsStore.currentProject = project;
		const { getByTestId } = renderComponent({
			global: {
				stubs: {
					N8nNavigationDropdown: {
						template: '<div><slot></slot></div>',
					},
				},
			},
		});

		expect(within(getByTestId('resource-add')).getByRole('button', { name: label })).toBeVisible();
	});
});
