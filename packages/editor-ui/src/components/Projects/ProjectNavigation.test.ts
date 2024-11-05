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

	it('should not show "Add project" button when conditions are not met', async () => {
		projectsStore.teamProjectsLimit = 0;
		projectsStore.hasPermissionToCreateProjects = false;

		const { queryByText } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByText('Add project')).not.toBeInTheDocument();
	});

	it('should show "Add project" button when conditions met', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.hasPermissionToCreateProjects = true;
		projectsStore.createProject.mockResolvedValue({
			id: '1',
			name: 'My project 1',
		} as Project);

		const { getByText } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(getByText('Add project')).toBeVisible();
		await userEvent.click(getByText('Add project'));

		expect(projectsStore.createProject).toHaveBeenCalledWith({
			name: 'My project',
		});
		expect(router.push).toHaveBeenCalledWith({
			name: VIEWS.PROJECT_SETTINGS,
			params: { projectId: '1' },
		});
		expect(toast.showMessage).toHaveBeenCalledWith({
			title: 'Project My project 1 saved successfully',
			type: 'success',
		});
	});

	it('should show "Add project" button tooltip when project creation limit reached', async () => {
		projectsStore.teamProjectsLimit = 3;
		projectsStore.hasPermissionToCreateProjects = true;
		projectsStore.canCreateProjects = false;

		const { getByText } = renderComponent({
			props: {
				collapsed: false,
				planName: 'Free',
			},
		});

		expect(getByText('Add project')).toBeVisible();
		await userEvent.hover(getByText('Add project'));

		expect(getByText(/You have reached the Free plan limit of 3/)).toBeVisible();
		await userEvent.click(getByText('View plans'));

		expect(pageRedirectionHelper.goToUpgrade).toHaveBeenCalledWith('rbac', 'upgrade-rbac');
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
