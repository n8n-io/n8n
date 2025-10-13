import { createRouter, createMemoryHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createProjectListItem } from '../__tests__/utils';
import ProjectsNavigation from './ProjectNavigation.vue';
import { useProjectsStore } from '../projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';

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
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

describe('ProjectsNavigation', () => {
	beforeEach(() => {
		createTestingPinia();

		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);
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

	it('should show Personal project when folders are enabled but projects are disabled', async () => {
		projectsStore.teamProjectsLimit = 0;
		settingsStore.isFoldersFeatureEnabled = true;

		const { queryByRole, getByTestId, queryByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		// Personal project menu item should be visible
		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		// Projects section should not be visible
		expect(queryByRole('heading', { level: 3, name: 'Projects' })).not.toBeInTheDocument();
		expect(queryByTestId('project-plus-button')).not.toBeInTheDocument();
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

	it('should show project plus button and add first project button in disabled state if user does not have permission', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.hasPermissionToCreateProjects = false;

		const { getByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});
		const plusButton = getByTestId('project-plus-button');
		const addFirstProjectButton = getByTestId('add-first-project-button');

		expect(plusButton).toBeVisible();
		expect(plusButton).toBeDisabled();
		expect(addFirstProjectButton).toBeVisible();
		expect(addFirstProjectButton).toBeDisabled();
	});

	it('should show add first project button without text when the menu is collapsed', async () => {
		projectsStore.teamProjectsLimit = -1;

		const { getByTestId } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(getByTestId('add-first-project-button')).toBeVisible();
		expect(getByTestId('add-first-project-button').classList.contains('collapsed')).toBe(true);
	});

	it('should not render shared menu item when only one verified user', async () => {
		// Only one verified user
		usersStore.allUsers = [
			{ id: '1', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
			{ id: '2', isPendingUser: true, isDefaultUser: false, mfaEnabled: false },
		];
		projectsStore.teamProjectsLimit = -1;
		projectsStore.isTeamProjectFeatureEnabled = true;

		const { queryByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		// The shared menu item should not be rendered
		expect(queryByTestId('project-shared-menu-item')).not.toBeInTheDocument();
	});

	it('should render shared menu item when more than one verified user', async () => {
		// Only one verified user
		usersStore.allUsers = [
			{ id: '1', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
			{ id: '2', isPendingUser: true, isDefaultUser: false, mfaEnabled: false },
			{ id: '3', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
		];
		projectsStore.teamProjectsLimit = -1;
		projectsStore.isTeamProjectFeatureEnabled = true;

		const { getByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		// The shared menu item should not be rendered
		expect(getByTestId('project-shared-menu-item')).toBeInTheDocument();
	});
});
