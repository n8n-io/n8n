import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createRouter, createMemoryHistory, useRouter } from 'vue-router';
import { createProjectListItem } from '@/__tests__/data/projects';
import ProjectsNavigation from '@/components/Projects//ProjectNavigation.vue';
import { useProjectsStore } from '@/stores/projects.store';
import { useUIStore } from '@/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import type { Project } from '@/types/projects.types';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';

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
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

describe('ProjectsNavigation', () => {
	beforeEach(() => {
		createTestingPinia();

		router = useRouter();
		toast = useToast();

		projectsStore = mockedStore(useProjectsStore);
		uiStore = mockedStore(useUIStore);
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

		expect(uiStore.goToUpgrade).toHaveBeenCalledWith('rbac', 'upgrade-rbac');
	});

	it('should show "Projects" title and projects if the user has access to any team project', async () => {
		projectsStore.myProjects = [...personalProjects, ...teamProjects];

		const { getByRole, getAllByTestId, getByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(getByRole('heading', { level: 3, name: 'Projects' })).toBeVisible();
		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		expect(getAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
	});

	it('should not show "Projects" title when the menu is collapsed', async () => {
		projectsStore.myProjects = [...personalProjects, ...teamProjects];

		const { queryByRole } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(queryByRole('heading', { level: 3, name: 'Projects' })).not.toBeInTheDocument();
	});
});
