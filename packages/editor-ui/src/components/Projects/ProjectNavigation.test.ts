import { createRouter, createMemoryHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createProjectListItem } from '@/__tests__/data/projects';
import ProjectsNavigation from '@/components/Projects/ProjectNavigation.vue';
import { useProjectsStore } from '@/stores/projects.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const push = vi.fn();
	return {
		...actual,
		useRouter: () => ({
			push,
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => ({
			showMessage,
			showError,
		}),
	};
});

vi.mock('@/composables/usePageRedirectionHelper', () => {
	const goToUpgrade = vi.fn();
	return {
		usePageRedirectionHelper: () => ({
			goToUpgrade,
		}),
	};
});

vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));

const renderComponent = createComponentRenderer(ProjectsNavigation, {
	global: {
		plugins: [
			createRouter({
				history: createMemoryHistory(),
				routes: [
					{
						path: '/',
						name: 'home',
						component: { template: '<div>Home</div>' },
					},
				],
			}),
		],
	},
});

let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

describe('ProjectsNavigation', () => {
	beforeEach(() => {
		createTestingPinia();

		projectsStore = mockedStore(useProjectsStore);
	});

	it('should not throw an error', () => {
		projectsStore.teamProjectsLimit = -1;
		expect(() => {
			renderComponent({
				props: {
					collapsed: false,
				},
			});
		}).not.toThrow();
	});

	it('should show "Projects" title and Personal project when the feature is enabled', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.myProjects = [...personalProjects, ...teamProjects];

		const { getByRole, getAllByTestId, getByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(getByRole('heading', { level: 3, name: 'Projects' })).toBeVisible();
		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		expect(getByTestId('project-personal-menu-item').querySelector('svg')).toBeVisible();
		expect(getAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
	});

	it('should not show "Projects" title when the menu is collapsed', async () => {
		projectsStore.teamProjectsLimit = -1;

		const { queryByRole } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(queryByRole('heading', { level: 3, name: 'Projects' })).not.toBeInTheDocument();
	});

	it('should not show "Projects" title when the feature is not enabled', async () => {
		projectsStore.teamProjectsLimit = 0;

		const { queryByRole } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByRole('heading', { level: 3, name: 'Projects' })).not.toBeInTheDocument();
	});

	it('should show project icons when the menu is collapsed', async () => {
		projectsStore.teamProjectsLimit = -1;

		const { getByTestId } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		expect(getByTestId('project-personal-menu-item').querySelector('svg')).toBeInTheDocument();
	});

	it('should not show add first project button if there are projects already', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.myProjects = [...teamProjects];

		const { queryByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByTestId('add-first-project-button')).not.toBeInTheDocument();
	});

	it('should not show project plus button and add first project button if user cannot create projects', async () => {
		projectsStore.teamProjectsLimit = 0;

		const { queryByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByTestId('project-plus-button')).not.toBeInTheDocument();
		expect(queryByTestId('add-first-project-button')).not.toBeInTheDocument();
	});

	it('should show project plus button and add first project button if user can create projects', async () => {
		projectsStore.teamProjectsLimit = -1;

		const { getByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(getByTestId('project-plus-button')).toBeVisible();
		expect(getByTestId('add-first-project-button')).toBeVisible();
	});
});
