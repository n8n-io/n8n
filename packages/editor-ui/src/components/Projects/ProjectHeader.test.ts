import { createTestingPinia } from '@pinia/testing';
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

	it('should render the correct title', async () => {
		const { getByText, rerender } = renderComponent();

		expect(getByText('Overview')).toBeVisible();

		projectsStore.currentProject = { type: ProjectTypes.Personal } as Project;
		await rerender({});
		expect(getByText('Personal')).toBeVisible();

		const projectName = 'My Project';
		projectsStore.currentProject = { name: projectName } as Project;
		await rerender({});
		expect(getByText(projectName)).toBeVisible();
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
		projectsStore.currentProject = createTestProject(
			createTestProject({ type: ProjectTypes.Personal, scopes: ['project:update'] }),
		);
		renderComponent();

		expect(projectTabsSpy).toHaveBeenCalledWith(
			{
				'show-settings': false,
			},
			null,
		);
	});
});
