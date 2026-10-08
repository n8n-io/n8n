import { nextTick } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import { promotionEventBus } from '@/features/integrations/promotions.ee/promotions.eventBus';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createProjectListItem, createTestProject } from '../__tests__/utils';
import ProjectsNavigation from './ProjectNavigation.vue';
import { useProjectsStore } from '../projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { resetExperienceModeState } from '@/features/ai/instanceAi/experience/useExperienceMode';
import { stubLocalStorage } from '@/features/ai/instanceAi/navigation/__tests__/navigationFixtures';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { EnterpriseEditionFeature } from '@/app/constants';
import type { ExperienceMode } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';

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

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => ({
			showMessage,
			showError,
		}),
	};
});

vi.mock('@/app/composables/usePageRedirectionHelper', () => {
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

// A router that can sit on a chat route; the default renderer only knows `home`.
const threadRouter = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/', name: 'home', component: { template: '<div>Home</div>' } },
		{
			path: '/instance-ai/:threadId',
			name: INSTANCE_AI_THREAD_VIEW,
			component: { template: '<div>Thread</div>' },
		},
	],
});
const renderOnThreadRoute = createComponentRenderer(ProjectsNavigation, {
	global: { plugins: [threadRouter] },
});

let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

const personalProjects = Array.from({ length: 3 }, createProjectListItem);
const teamProjects = Array.from({ length: 3 }, () => createProjectListItem('team'));

describe('ProjectsNavigation', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', {
			getItem: vi.fn().mockReturnValue(null),
			setItem: vi.fn(),
		});
		createTestingPinia();

		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);
	});

	function configureInstanceAi(setupCompleted: boolean) {
		settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
		settingsStore.moduleSettings = {
			'instance-ai': {
				enabled: true,
				mcpConnectionsAvailable: true,
				localGatewayDisabled: false,
				browserUseEnabled: true,
				proxyEnabled: false,
				cloudManaged: false,
				setupCompleted,
				sandboxEnabled: true,
				workflowBuilderAvailable: true,
				sandboxUnavailableReason: null,
				runDebugEnabled: false,
			},
		};
	}

	function configureInstanceAiScopes({ canManage }: { canManage: boolean }) {
		vi.mocked(useRBACStore().hasScope).mockImplementation((scope) => {
			if (scope === 'instanceAi:manage') return canManage;
			if (scope === 'instanceAi:message') return true;
			return false;
		});
	}

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

	it('should reload the projects after a package was applied', async () => {
		projectsStore.teamProjectsLimit = -1;
		renderComponent({ props: { collapsed: false } });
		// The listener registers once the users are fetched.
		await waitFor(() => expect(usersStore.fetchUsers).toHaveBeenCalled());
		await nextTick();

		promotionEventBus.emit('applied', { projectId: 'project-1' });

		await waitFor(() => expect(projectsStore.getMyProjects).toHaveBeenCalled());
	});

	it('should reload the projects after a package removed one', async () => {
		projectsStore.teamProjectsLimit = -1;
		renderComponent({ props: { collapsed: false } });
		await waitFor(() => expect(usersStore.fetchUsers).toHaveBeenCalled());
		await nextTick();

		promotionEventBus.emit('projectRemoved', { projectId: 'project-1' });

		await waitFor(() => expect(projectsStore.getMyProjects).toHaveBeenCalled());
	});

	it('should show "Projects" title and Personal project when the feature is enabled', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.myProjects = [...personalProjects, ...teamProjects];
		projectsStore.personalProject = createTestProject({ type: 'personal' });

		const { getAllByTestId, getByTestId, queryByText } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByText('Projects')).toBeVisible();
		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		expect(getByTestId('project-personal-menu-item').querySelector('svg')).toBeVisible();
		expect(getAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
	});

	it('should show Instance AI above Home for a member after setup is complete', () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(true);

		const { getByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(
			getByTestId('project-instance-ai-menu-item').compareDocumentPosition(
				getByTestId('project-home-menu-item'),
			) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('should keep the open chat listed when it is older than the five most recent', async () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(true);
		const instanceAiStore = mockedStore(useInstanceAiStore);
		instanceAiStore.threads = Array.from({ length: 7 }, (_, index) => ({
			id: `thread-${index}`,
			title: `Chat ${index}`,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		}));
		await threadRouter.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId: 'thread-6' } });

		const { getByTestId } = renderOnThreadRoute({ props: { collapsed: false } });

		const chats = getByTestId('instance-ai-sidebar-chats').textContent ?? '';
		expect(chats.match(/Chat \d/g)).toEqual(['Chat 0', 'Chat 1', 'Chat 2', 'Chat 3', 'Chat 6']);
	});

	it('should reload the recent chats when the tab becomes visible again', () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(true);
		const instanceAiStore = mockedStore(useInstanceAiStore);

		renderComponent({ props: { collapsed: false } });
		expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(1);

		const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(1);

		hidden.mockReturnValue(false);
		document.dispatchEvent(new Event('visibilitychange'));
		hidden.mockRestore();

		expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(2);
	});

	it('should not load chats on tab visibility when Instance AI is hidden', () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(false);
		const instanceAiStore = mockedStore(useInstanceAiStore);

		renderComponent({ props: { collapsed: false } });
		document.dispatchEvent(new Event('visibilitychange'));

		expect(instanceAiStore.loadThreads).not.toHaveBeenCalled();
	});

	it('should hide Instance AI from a member until setup is complete', () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(false);

		const { queryByTestId } = renderComponent({ props: { collapsed: false } });

		expect(queryByTestId('project-instance-ai-menu-item')).toBeNull();
	});

	it('should show Instance AI to an admin before setup is complete', () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: true });
		configureInstanceAi(false);

		const { getByTestId } = renderComponent({ props: { collapsed: false } });

		expect(getByTestId('project-instance-ai-menu-item')).toBeVisible();
	});

	it('should not show "Projects" title when the menu is collapsed', async () => {
		projectsStore.teamProjectsLimit = -1;

		const { queryByText } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(queryByText('Projects')).not.toBeInTheDocument();
	});

	it('should not show "Projects" title when the feature is not enabled', async () => {
		projectsStore.teamProjectsLimit = 0;

		const { queryByText } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(queryByText('Projects')).not.toBeInTheDocument();
	});

	it('should show Personal project when folders are enabled but projects are disabled', async () => {
		projectsStore.teamProjectsLimit = 0;
		settingsStore.isFoldersFeatureEnabled = true;
		projectsStore.personalProject = createTestProject({ type: 'personal' });

		const { queryByText, getByTestId, queryByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		// Personal project menu item should be visible
		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		// Projects section should not be visible
		expect(queryByText('Projects')).not.toBeInTheDocument();
		expect(queryByTestId('project-plus-button')).not.toBeInTheDocument();
	});

	it('should show project icons when the menu is collapsed', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.personalProject = createTestProject({ type: 'personal' });

		const { getByTestId } = renderComponent({
			props: {
				collapsed: true,
			},
		});

		expect(getByTestId('project-personal-menu-item')).toBeVisible();
		expect(getByTestId('project-personal-menu-item').querySelector('svg')).toBeInTheDocument();
	});

	it('should projects section when there are projects', async () => {
		projectsStore.teamProjectsLimit = -1;
		projectsStore.myProjects = [...teamProjects];

		const { getByText } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		expect(getByText('Projects')).toBeVisible();
	});

	it('should render a fallback icon for projects with no icon set', async () => {
		projectsStore.teamProjectsLimit = -1;
		const projectWithoutIcon = createProjectListItem('team');
		projectWithoutIcon.icon = null;
		projectsStore.myProjects = [projectWithoutIcon];

		const { getAllByTestId } = renderComponent({
			props: {
				collapsed: false,
			},
		});

		const items = getAllByTestId('project-menu-item');
		expect(items).toHaveLength(1);
		expect(items[0].querySelector('svg')).toBeInTheDocument();
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

	describe('with experience modes', () => {
		const WORKSPACE_OPEN_KEY = 'n8n:sidebar:workspace-open';
		const HIDDEN_IN_SIMPLE = [
			'project-personal-menu-item',
			'project-shared-menu-item',
			'project-workflow-reviews-menu-item',
			'project-chat-menu-item',
		];
		const storage = new Map<string, string>();

		beforeEach(() => {
			resetExperienceModeState();
			storage.clear();
			stubLocalStorage(storage);
			// The chat list listens for live updates while experience modes are on.
			mockedStore(usePushConnectionStore).addEventListener.mockReturnValue(() => {});
		});

		/** Turns on experience modes with `mode` as the instance default. */
		function useMode(mode: ExperienceMode) {
			const instanceAiSettings = settingsStore.moduleSettings['instance-ai'];
			if (instanceAiSettings) instanceAiSettings.experience = { enabled: true, defaultMode: mode };
		}

		/** A sidebar where every item can show: projects, sharing, reviews, chat hub, a favourite and a chat. */
		function fillSidebar() {
			configureInstanceAi(true);
			vi.mocked(useRBACStore().hasScope).mockImplementation(
				(scope) => scope === 'instanceAi:message' || scope === 'chatHub:message',
			);
			projectsStore.teamProjectsLimit = -1;
			projectsStore.isTeamProjectFeatureEnabled = true;
			projectsStore.myProjects = [...teamProjects];
			projectsStore.personalProject = createTestProject({ type: 'personal' });
			usersStore.allUsers = [
				{ id: '1', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
				{ id: '2', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
			];
			settingsStore.isChatFeatureEnabled = true;
			settingsStore.isEnterpriseFeatureEnabled = {
				...settingsStore.isEnterpriseFeatureEnabled,
				[EnterpriseEditionFeature.WorkflowReviews]: true,
			};
			settingsStore.settings = {
				...settingsStore.settings,
				workflowReviews: { enabled: true },
			} as typeof settingsStore.settings;
			mockedStore(useFavoritesStore).favorites = [
				{
					id: 1,
					userId: '1',
					resourceId: 'workflow-1',
					resourceType: 'workflow',
					resourceName: 'Invoice flow',
				},
			];
			mockedStore(useInstanceAiStore).threads = [
				{
					id: 'thread-1',
					title: 'Weekly report',
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
			];
		}

		/** True when `first` comes before `second` in the document. */
		function precedes(first: Element, second: Element) {
			return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
		}

		it('shows every item in Power mode, as with the flag off', () => {
			fillSidebar();
			useMode('power');

			const { getByTestId, getByText, getAllByTestId, getByRole, queryByRole } = renderComponent({
				props: { collapsed: false },
			});

			for (const testId of HIDDEN_IN_SIMPLE) expect(getByTestId(testId)).toBeInTheDocument();
			expect(getByText('Favorites')).toBeVisible();
			expect(getByText('Projects')).toBeVisible();
			expect(getAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
			expect(queryByRole('button', { name: 'Workspace' })).not.toBeInTheDocument();
			// Without the Workspace, Favorites and Projects are top sections, like Chats.
			expect(getByRole('heading', { level: 2, name: 'Favorites' })).toBeInTheDocument();
			expect(getByRole('heading', { level: 2, name: 'Projects' })).toBeInTheDocument();
		});

		it('shows no Workspace with the flag off', () => {
			fillSidebar();

			const { getByTestId, getByText, queryByRole } = renderComponent({
				props: { collapsed: false },
			});

			for (const testId of HIDDEN_IN_SIMPLE) expect(getByTestId(testId)).toBeInTheDocument();
			expect(getByText('Projects')).toBeVisible();
			expect(queryByRole('button', { name: 'Workspace' })).not.toBeInTheDocument();
		});

		it('keeps only the Assistant and Overview on top in Simple mode, then Chats, then a collapsed Workspace', () => {
			fillSidebar();
			useMode('simple');

			const { getByTestId, getByRole, queryByTestId, queryByText } = renderComponent({
				props: { collapsed: false },
			});

			expect(getByTestId('project-instance-ai-menu-item')).toBeInTheDocument();
			expect(getByTestId('project-home-menu-item')).toBeInTheDocument();
			for (const testId of HIDDEN_IN_SIMPLE) expect(queryByTestId(testId)).not.toBeInTheDocument();

			const workspace = getByRole('button', { name: 'Workspace' });
			expect(workspace).toHaveAttribute('aria-expanded', 'false');
			expect(precedes(getByTestId('instance-ai-sidebar-chats'), workspace)).toBe(true);
			expect(queryByText('Favorites')).not.toBeInTheDocument();
			expect(queryByText('Projects')).not.toBeInTheDocument();
			expect(queryByText('Invoice flow')).not.toBeInTheDocument();
			expect(queryByTestId('project-menu-item')).not.toBeInTheDocument();
		});

		it('opens Favorites and Projects below the Workspace, and remembers it', async () => {
			fillSidebar();
			useMode('simple');

			const { getByRole, getByText, getAllByTestId } = renderComponent({
				props: { collapsed: false },
			});
			const workspace = getByRole('button', { name: 'Workspace' });

			await userEvent.click(workspace);

			expect(workspace).toHaveAttribute('aria-expanded', 'true');
			const projectItems = getAllByTestId('project-menu-item');
			expect(projectItems).toHaveLength(teamProjects.length);
			expect(precedes(workspace, getByText('Favorites'))).toBe(true);
			expect(precedes(getByText('Favorites'), getByText('Projects'))).toBe(true);
			expect(precedes(getByText('Projects'), projectItems[0])).toBe(true);
			expect(getByText('Invoice flow')).toBeInTheDocument();
			await waitFor(() => expect(storage.get(WORKSPACE_OPEN_KEY)).toBe('true'));
		});

		it('keeps every hidden page reachable: the open Workspace lists them first, in the top-group order', async () => {
			fillSidebar();
			useMode('simple');

			const { getByRole, getByTestId, getByText, queryByTestId } = renderComponent({
				props: { collapsed: false },
			});
			const workspace = getByRole('button', { name: 'Workspace' });

			await userEvent.click(workspace);

			const items = HIDDEN_IN_SIMPLE.map((testId) => getByTestId(testId));
			expect(precedes(workspace, items[0])).toBe(true);
			for (let index = 1; index < items.length; index++) {
				expect(precedes(items[index - 1], items[index])).toBe(true);
			}
			expect(precedes(items[items.length - 1], getByText('Favorites'))).toBe(true);
			expect(getByTestId('project-personal-menu-item')).toHaveTextContent('Personal');
			expect(getByTestId('project-shared-menu-item')).toHaveTextContent('Shared with you');

			await userEvent.click(workspace);

			for (const testId of HIDDEN_IN_SIMPLE) expect(queryByTestId(testId)).not.toBeInTheDocument();
		});

		it('lists in the Workspace only the hidden pages that the user can open', async () => {
			storage.set(WORKSPACE_OPEN_KEY, 'true');
			fillSidebar();
			settingsStore.isChatFeatureEnabled = false;
			usersStore.allUsers = [
				{ id: '1', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
			];
			useMode('simple');

			const { findByTestId, queryByTestId, getByTestId } = renderComponent({
				props: { collapsed: false },
			});

			expect(await findByTestId('project-personal-menu-item')).toBeInTheDocument();
			expect(getByTestId('project-workflow-reviews-menu-item')).toBeInTheDocument();
			expect(queryByTestId('project-shared-menu-item')).not.toBeInTheDocument();
			expect(queryByTestId('project-chat-menu-item')).not.toBeInTheDocument();
		});

		it('marks Favorites and Projects as sub-headings of the Workspace, each with its own state', async () => {
			storage.set(WORKSPACE_OPEN_KEY, 'true');
			fillSidebar();
			useMode('simple');

			const { findByRole, getByRole } = renderComponent({ props: { collapsed: false } });

			const favorites = await findByRole('heading', { level: 3, name: 'Favorites' });
			const favoritesToggle = within(favorites).getByRole('button', { name: 'Favorites' });
			const projects = getByRole('heading', { level: 3, name: 'Projects' });
			const projectsToggle = within(projects).getByRole('button', { name: 'Projects' });
			expect(favoritesToggle).toHaveAttribute('aria-expanded', 'true');
			expect(projectsToggle).toHaveAttribute('aria-expanded', 'true');

			await userEvent.click(projectsToggle);

			expect(projectsToggle).toHaveAttribute('aria-expanded', 'false');
			expect(favoritesToggle).toHaveAttribute('aria-expanded', 'true');
		});

		it('shows the Workspace open when the user left it open', async () => {
			storage.set(WORKSPACE_OPEN_KEY, 'true');
			fillSidebar();
			useMode('simple');

			const { getByRole, findAllByTestId } = renderComponent({ props: { collapsed: false } });

			expect(await findAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true');
		});

		it('opens the Workspace on a page that it holds, so the sidebar shows where the user is', async () => {
			fillSidebar();
			useMode('simple');
			projectsStore.projectNavActiveId = 'shared';

			const { findByTestId, getByRole } = renderComponent({ props: { collapsed: false } });

			expect(await findByTestId('project-shared-menu-item')).toBeInTheDocument();
			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'true');
			// The user did not open it, so the next visit starts closed again.
			expect(storage.has(WORKSPACE_OPEN_KEY)).toBe(false);
		});

		it('opens the Workspace on a team project page and lists the projects', async () => {
			fillSidebar();
			useMode('simple');
			projectsStore.projectNavActiveId = teamProjects[0].id;

			const { findAllByTestId, getByRole } = renderComponent({ props: { collapsed: false } });

			expect(await findAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
			expect(getByRole('heading', { level: 3, name: 'Projects' })).toBeInTheDocument();
		});

		it('keeps the Workspace closed on a page outside it', async () => {
			fillSidebar();
			useMode('simple');
			projectsStore.projectNavActiveId = 'home';

			const { getByRole, queryByTestId } = renderComponent({ props: { collapsed: false } });
			await nextTick();

			expect(getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-expanded', 'false');
			expect(queryByTestId('project-shared-menu-item')).not.toBeInTheDocument();
		});

		it('gives the collapsed sidebar an icon toggle that shows the project icons', async () => {
			fillSidebar();
			useMode('simple');

			const { getByRole, getByTestId, queryAllByTestId } = renderComponent({
				props: { collapsed: true },
			});
			expect(queryAllByTestId('project-menu-item')).toHaveLength(0);

			await userEvent.click(getByRole('button', { name: 'Workspace' }));

			expect(queryAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
			expect(getByTestId('project-personal-menu-item')).toBeInTheDocument();
		});

		/** No favourite, no review inbox and no chat hub: only projects could fill the Workspace. */
		function leaveOnlyProjects() {
			fillSidebar();
			mockedStore(useFavoritesStore).favorites = [];
			settingsStore.isChatFeatureEnabled = false;
			settingsStore.settings = {
				...settingsStore.settings,
				workflowReviews: { enabled: false },
			} as typeof settingsStore.settings;
		}

		it('shows no Workspace when there is nothing to put in it', () => {
			leaveOnlyProjects();
			projectsStore.myProjects = [];
			projectsStore.personalProject = null;
			// With one user, nothing can be shared with this user.
			usersStore.allUsers = [
				{ id: '1', isPendingUser: false, isDefaultUser: false, mfaEnabled: false },
			];
			useMode('simple');

			const { queryByRole } = renderComponent({ props: { collapsed: false } });

			expect(queryByRole('button', { name: 'Workspace' })).not.toBeInTheDocument();
		});

		it('shows no Workspace when the team projects stay without licence and folders are off', () => {
			leaveOnlyProjects();
			projectsStore.isTeamProjectFeatureEnabled = false;
			settingsStore.isFoldersFeatureEnabled = false;
			useMode('simple');

			const { queryByRole, queryByTestId } = renderComponent({ props: { collapsed: false } });

			expect(queryByRole('button', { name: 'Workspace' })).not.toBeInTheDocument();
			expect(queryByTestId('project-menu-item')).not.toBeInTheDocument();
		});

		it('lists the personal project and the projects without a Projects title when only folders are on', async () => {
			leaveOnlyProjects();
			projectsStore.isTeamProjectFeatureEnabled = false;
			settingsStore.isFoldersFeatureEnabled = true;
			useMode('simple');

			const { getByRole, getByTestId, getAllByTestId, queryByText } = renderComponent({
				props: { collapsed: false },
			});
			await userEvent.click(getByRole('button', { name: 'Workspace' }));

			expect(getByTestId('project-personal-menu-item')).toBeInTheDocument();
			expect(getAllByTestId('project-menu-item')).toHaveLength(teamProjects.length);
			expect(queryByText('Projects')).not.toBeInTheDocument();
		});
	});
});
