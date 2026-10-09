import { nextTick, ref } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { promotionEventBus } from '@/features/integrations/promotions.ee/promotions.eventBus';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { usePostHog } from '@/app/stores/posthog.store';
import { createProjectListItem, createTestProject } from '../__tests__/utils';
import ProjectsNavigation from './ProjectNavigation.vue';
import { useProjectsStore } from '../projects.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_N8N_CHAT_VIEW } from '@/features/agents/constants';
import { useAgentN8nChatThreadsStore } from '@/features/agents/n8nChatPage/n8nChatThreads.store';

const trackMock = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

// A real ref — reactive watchers in the component and `useRecentChats` must see this
// change after mount, which a plain `{ value }` object wouldn't trigger.
const n8nChatFlagRef = ref(false);
vi.mock('@/features/agents/composables/useAgentsN8nChatFlag', () => ({
	useAgentsN8nChatFlag: () => n8nChatFlagRef,
}));

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
		{
			path: '/assistant/agents/:agentId/:agentThreadId?',
			name: AGENT_N8N_CHAT_VIEW,
			component: { template: '<div>Agent thread</div>' },
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
		trackMock.mockReset();
		n8nChatFlagRef.value = false;
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

	// The common fixture for the sidebar's Instance AI entry: unlimited team projects,
	// a member (not admin) with setup already complete.
	function setupInstanceAiMember() {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(true);
	}

	function enableFlag() {
		n8nChatFlagRef.value = true;
		// createTestingPinia stubs every store function (including `getVariant`) as a
		// no-op, so the telemetry payload's variant string must be forced this way too.
		mockedStore(usePostHog).getVariant.mockImplementation((flag) =>
			flag === AGENTS_N8N_CHAT_FLAG ? 'variant-a' : undefined,
		);
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
		setupInstanceAiMember();

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
		setupInstanceAiMember();
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

	it('should also reload agent threads on tab visibility when the n8n Chat flag is on', () => {
		projectsStore.teamProjectsLimit = -1;
		configureInstanceAiScopes({ canManage: false });
		configureInstanceAi(true);
		enableFlag();
		const agentThreadsStore = mockedStore(useAgentN8nChatThreadsStore);

		renderComponent({ props: { collapsed: false } });
		expect(agentThreadsStore.fetchRecent).toHaveBeenCalledTimes(1);

		const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(agentThreadsStore.fetchRecent).toHaveBeenCalledTimes(1);

		hidden.mockReturnValue(false);
		document.dispatchEvent(new Event('visibilitychange'));
		hidden.mockRestore();

		expect(agentThreadsStore.fetchRecent).toHaveBeenCalledTimes(2);
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

	it('refetches only agent threads when the flag turns on after mount', async () => {
		setupInstanceAiMember();
		const instanceAiStore = mockedStore(useInstanceAiStore);
		const agentThreadsStore = mockedStore(useAgentN8nChatThreadsStore);

		renderComponent({ props: { collapsed: false } });
		await waitFor(() => expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(1));
		expect(agentThreadsStore.fetchRecent).not.toHaveBeenCalled();

		enableFlag();
		await waitFor(() => expect(agentThreadsStore.fetchRecent).toHaveBeenCalledTimes(1));
		expect(instanceAiStore.loadThreads).toHaveBeenCalledTimes(1);
	});

	it('forces "New chat" inactive only on an agent thread page, not the agent-only new-chat URL', async () => {
		setupInstanceAiMember();
		// The forced-inactive class is CSS-module scoped (an unpredictable hashed name), so
		// compare against the plain-home baseline rather than asserting a literal class name.
		// Each render is unmounted before the next — cleanup only runs between tests.
		function classFor(view: ReturnType<typeof renderOnThreadRoute>) {
			const className = view.getByTestId('project-instance-ai-menu-item').className;
			view.unmount();
			return className;
		}

		await threadRouter.push({ name: 'home' });
		const atHome = classFor(renderOnThreadRoute({ props: { collapsed: false } }));

		await threadRouter.push({ name: AGENT_N8N_CHAT_VIEW, params: { agentId: 'agent-1' } });
		const atNewChatUrl = classFor(renderOnThreadRoute({ props: { collapsed: false } }));
		expect(atNewChatUrl).toBe(atHome);

		await threadRouter.push({
			name: AGENT_N8N_CHAT_VIEW,
			params: { agentId: 'agent-1', agentThreadId: 'thread-1' },
		});
		const atThreadUrl = classFor(renderOnThreadRoute({ props: { collapsed: false } }));
		expect(atThreadUrl).not.toBe(atHome);
	});

	describe('with the n8n Chat flag on', () => {
		it('shows "New chat" on the top Assistant item instead of "Assistant"', () => {
			setupInstanceAiMember();
			enableFlag();

			const { getByTestId, queryByText } = renderComponent({ props: { collapsed: false } });

			expect(getByTestId('project-instance-ai-menu-item').textContent).toContain('New chat');
			expect(queryByText('Assistant')).toBeNull();
		});

		it('uses the new-chat icon on "New chat" and the AI sparkle on Assistant threads', async () => {
			setupInstanceAiMember();
			enableFlag();
			mockedStore(useInstanceAiStore).threads = [
				{
					id: 'assistant-1',
					title: 'Assistant chat',
					createdAt: '2026-01-02T00:00:00.000Z',
					updatedAt: '2026-01-02T00:00:00.000Z',
				},
			];

			const { getByTestId } = renderComponent({ props: { collapsed: false } });
			await nextTick();

			expect(
				getByTestId('project-instance-ai-menu-item').querySelector(
					'[data-icon="message-square-plus"]',
				),
			).not.toBeNull();
			expect(
				getByTestId('instance-ai-sidebar-chats').querySelector('[data-icon="sparkles"]'),
			).not.toBeNull();
		});

		it('merges agent threads into the sidebar chats list by updatedAt', async () => {
			setupInstanceAiMember();
			enableFlag();
			const instanceAiStore = mockedStore(useInstanceAiStore);
			instanceAiStore.threads = [
				{
					id: 'assistant-1',
					title: 'Assistant chat',
					createdAt: '2026-01-02T00:00:00.000Z',
					updatedAt: '2026-01-02T00:00:00.000Z',
				},
			];
			const agentThreadsStore = mockedStore(useAgentN8nChatThreadsStore);
			agentThreadsStore.recentThreads = [
				{
					id: 'agent-thread-1',
					title: 'Agent chat',
					updatedAt: '2026-01-03T00:00:00.000Z',
					agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
				},
			];

			const { getByTestId } = renderComponent({ props: { collapsed: false } });
			await nextTick();

			const chats = getByTestId('instance-ai-sidebar-chats');
			const titles = Array.from(chats.querySelectorAll('[role="menuitem"]')).map(
				(el) => el.textContent,
			);
			expect(titles).toEqual(['Agent chat', 'Assistant chat']);
		});

		it('shows a fallback title for an untitled agent thread', async () => {
			setupInstanceAiMember();
			enableFlag();
			const agentThreadsStore = mockedStore(useAgentN8nChatThreadsStore);
			agentThreadsStore.recentThreads = [
				{
					id: 'agent-thread-1',
					title: null,
					updatedAt: '2026-01-03T00:00:00.000Z',
					agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
				},
			];

			const { getByTestId } = renderComponent({ props: { collapsed: false } });
			await nextTick();

			expect(getByTestId('instance-ai-sidebar-chats').textContent).toContain('New conversation');
		});

		it('tracks a telemetry event when the New chat item is clicked', async () => {
			setupInstanceAiMember();
			enableFlag();

			const { getByTestId } = renderComponent({ props: { collapsed: false } });
			getByTestId('project-instance-ai-menu-item')
				.querySelector<HTMLElement>('[role="menuitem"]')
				?.click();

			expect(trackMock).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_N8N_CHAT_SIDEBAR_ITEM,
				{
					item: 'new_chat',
					variant: 'variant-a',
					session_id: expect.any(String),
				},
			);
		});

		it('tracks a telemetry event when a chat item is clicked', async () => {
			setupInstanceAiMember();
			enableFlag();
			const agentThreadsStore = mockedStore(useAgentN8nChatThreadsStore);
			agentThreadsStore.recentThreads = [
				{
					id: 'agent-thread-1',
					title: 'Agent chat',
					updatedAt: '2026-01-03T00:00:00.000Z',
					agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
				},
			];

			const { getByText } = renderComponent({ props: { collapsed: false } });
			await nextTick();
			getByText('Agent chat').click();

			expect(trackMock).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CLICKED_N8N_CHAT_SIDEBAR_ITEM,
				{
					item: 'chat',
					chat_type: 'agent',
					variant: 'variant-a',
					session_id: expect.any(String),
				},
			);
		});
	});

	it('does not track or merge agent threads when the n8n Chat flag is off', async () => {
		setupInstanceAiMember();
		const agentThreadsStore = mockedStore(useAgentN8nChatThreadsStore);
		agentThreadsStore.recentThreads = [
			{
				id: 'agent-thread-1',
				title: 'Agent chat',
				updatedAt: '2026-01-03T00:00:00.000Z',
				agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
			},
		];

		const { getByTestId, queryByText } = renderComponent({ props: { collapsed: false } });
		await nextTick();
		getByTestId('project-instance-ai-menu-item')
			.querySelector<HTMLElement>('[role="menuitem"]')
			?.click();

		expect(queryByText('Agent chat')).toBeNull();
		expect(trackMock).not.toHaveBeenCalled();
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
});
