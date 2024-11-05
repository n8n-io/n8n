import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createRouter, createMemoryHistory, useRouter } from 'vue-router';
import { createProjectListItem } from '@/__tests__/data/projects';
import ProjectsNavigation from '@/components/Projects//ProjectNavigation.vue';
import { useProjectsStore } from '@/stores/projects.store';
import { mockedStore } from '@/__tests__/utils';
import type { Project } from '@/types/projects.types';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

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

let router: ReturnType<typeof useRouter>;
let toast: ReturnType<typeof useToast>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let pageRedirectionHelper: ReturnType<typeof usePageRedirectionHelper>;

const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

describe('ProjectsNavigation', () => {
	beforeEach(() => {
		createTestingPinia();

		router = useRouter();
		toast = useToast();
		pageRedirectionHelper = usePageRedirectionHelper();

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
		projectsStore.isTeamProjectFeatureEnabled = true;
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
		projectsStore.isTeamProjectFeatureEnabled = true;

		const { queryByRole } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(queryByRole('heading', { level: 3, name: 'Projects' })).not.toBeInTheDocument();
	});

	it('should not show "Projects" title when the feature is not enabled', async () => {
		projectsStore.isTeamProjectFeatureEnabled = false;

		const { queryByRole } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByRole('heading', { level: 3, name: 'Projects' })).not.toBeInTheDocument();
	});

	it('should not show project icons when the menu is collapsed', async () => {
		projectsStore.isTeamProjectFeatureEnabled = true;

		const { getByTestId } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		expect(getByTestId('project-personal-menu-item').querySelector('svg')).not.toBeInTheDocument();
	});
});
