/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- test-only patterns: @vue/test-utils is a transitive devDep and private-state reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const routerPush = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPush, replace: vi.fn() }),
	useRoute: () => ({ params: { projectId: 'p1', agentId: 'a1' }, query: {} }),
	onBeforeRouteLeave: vi.fn(),
	onBeforeRouteUpdate: vi.fn(),
	RouterLink: { template: '<a><slot/></a>' },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		personalProject: { id: 'p1' },
		currentProject: { id: 'p1', name: 'My project' },
		myProjects: [{ id: 'p1', name: 'My project' }],
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentials: vi.fn().mockResolvedValue(undefined),
		fetchCredentialTypes: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: vi.fn(),
		closeModal: vi.fn(),
	}),
}));

const updateAgentMock = vi.fn();
const getIntegrationStatusMock = vi.fn();
const publishAgentMock = vi.fn();

vi.mock('../composables/useAgentApi', () => ({
	getAgent: vi.fn().mockResolvedValue({
		id: 'a1',
		name: 'Agent One',
		description: null,
		tools: {},
		updatedAt: '2026-01-01T00:00:00Z',
		publishedVersion: null,
		versionId: 'v1',
	}),
	updateAgent: updateAgentMock,
	deleteAgent: vi.fn(),
	publishAgent: publishAgentMock,
	getIntegrationStatus: getIntegrationStatusMock,
}));

vi.mock('../composables/useAgentBuilderTelemetry', () => ({
	useAgentBuilderTelemetry: () => ({
		resetForAgentSwitch: vi.fn(),
		captureToolsBaseline: vi.fn(),
		fetchInitialTriggersBaseline: vi.fn().mockResolvedValue(null),
		recordConfigEdit: vi.fn(),
		flushConfigEdits: vi.fn(),
		trackToolsAdded: vi.fn(),
		trackPublished: vi.fn(),
	}),
}));

// Real ref so the view's `watch(config, ...)` fires and populates `localConfig`.
// Tests that need an unbuilt agent flip this to empty instructions before render.
const mockConfig = ref<{ name: string; instructions: string } | null>({
	name: 'Agent One',
	instructions: 'You are a helpful assistant.',
});
// Stash the "desired config" separately so the fetchConfig mock can restore
// the ref after `initialize()` clears `localConfig` and re-fetches. Without
// this, the view's `localConfig = null` reset sticks — the config ref hasn't
// changed, so the `watch(config, ...)` listener doesn't re-fire.
let intendedConfig: { name: string; instructions: string } | null = {
	name: 'Agent One',
	instructions: 'You are a helpful assistant.',
};

vi.mock('../composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: mockConfig,
		fetchConfig: vi.fn().mockImplementation(async () => {
			// Mimic the real composable: re-publish the fetched config by touching
			// the ref, which triggers watchers even when the shape is unchanged.
			mockConfig.value = intendedConfig ? { ...intendedConfig } : null;
		}),
		updateConfig: vi.fn().mockResolvedValue({ versionId: 'v1' }),
	}),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: [],
		loading: false,
		fetchThreads: vi.fn().mockResolvedValue(undefined),
		startAutoRefresh: vi.fn(),
		stopAutoRefresh: vi.fn(),
		reset: vi.fn(),
	}),
}));

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [] },
		ensureLoaded: vi.fn().mockResolvedValue([]),
	}),
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: { value: [] },
		ensureLoaded: vi.fn().mockResolvedValue([]),
		refresh: vi.fn(),
	}),
}));

const baseTextFn = (key: string) => {
	const map: Record<string, string> = {
		'agents.builder.chatMode.build': 'Build',
		'agents.builder.chatMode.test': 'Test',
		'agents.builder.chatMode.ariaLabel': 'Switch chat mode',
	};
	return map[key] ?? key;
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: baseTextFn }),
	i18n: { baseText: baseTextFn },
}));

// The first test in this file pays the one-time SFC transform cost for
// AgentBuilderView.vue and its dependencies. A generous timeout gives that
// first render enough headroom; subsequent tests hit the cached module and
// finish well under the default budget.
vi.setConfig({ testTimeout: 30_000 });

/** Shared stubs used by both mount helpers. */
async function renderView() {
	const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
	const wrapper = mount(AgentBuilderView, {
		global: {
			stubs: commonStubs,
		},
	});
	await flushPromises();
	return wrapper;
}

const commonStubs = {
	AgentChatPanel: {
		name: 'AgentChatPanel',
		template:
			'<div data-testid="chat-panel-stub" :data-endpoint="endpoint"><slot name="above-input" /></div>',
		props: [
			'endpoint',
			'projectId',
			'agentId',
			'mode',
			'initialMessage',
			'agentConfig',
			'agentStatus',
			'connectedTriggers',
		],
	},
	AgentConfigTree: {
		name: 'AgentConfigTree',
		template: '<div data-testid="stub-agent-config-tree" />',
		props: ['config', 'selectedKey'],
		emits: ['select'],
	},
	AgentSectionEditor: {
		name: 'AgentSectionEditor',
		template: '<div data-testid="stub-agent-section-editor" />',
		props: ['config'],
		emits: ['update:config'],
	},
	AgentChatQuickActions: {
		name: 'AgentChatQuickActions',
		template: '<div data-testid="stub-agent-chat-quick-actions" />',
		props: ['tools', 'projectId', 'agentId', 'connectedTriggers'],
		emits: ['update:tools', 'update:connected-triggers', 'trigger-added'],
	},
	AgentBuilderHeader: {
		name: 'AgentBuilderHeader',
		template:
			'<div data-testid="stub-agent-builder-header" :data-chat-collapsed="chatColumnCollapsed"></div>',
		props: ['agent', 'projectId', 'agentId', 'projectName', 'headerActions', 'chatColumnCollapsed'],
		emits: [
			'back',
			'toggle-chat-column',
			'header-action',
			'published',
			'unpublished',
			'switch-agent',
		],
	},
	// Stub each panel that the editor column dispatches to. These panels pull
	// in stores / composables (users, chatHub, credentials, sessions list)
	// that the view-level test isn't trying to exercise — leaving them real
	// would require mocking the full surrounding ecosystem just to mount.
	AgentInfoPanel: {
		name: 'AgentInfoPanel',
		template: '<div data-testid="stub-agent-info-panel" />',
		props: ['config', 'disabled'],
		emits: ['update:config'],
	},
	AgentAdvancedPanel: {
		name: 'AgentAdvancedPanel',
		template: '<div data-testid="stub-agent-advanced-panel" />',
		props: ['config', 'disabled'],
		emits: ['update:config'],
	},
	AgentMemoryPanel: {
		name: 'AgentMemoryPanel',
		template: '<div data-testid="stub-agent-memory-panel" />',
		props: ['config', 'disabled'],
		emits: ['update:config'],
	},
	AgentEvalsPanel: {
		name: 'AgentEvalsPanel',
		template: '<div data-testid="stub-agent-evals-panel" />',
	},
	AgentToolsListPanel: {
		name: 'AgentToolsListPanel',
		template: '<div data-testid="stub-agent-tools-list-panel" />',
		props: ['tools', 'config', 'disabled'],
		emits: ['open-tool', 'add-tool', 'remove-tool', 'update:config'],
	},
	AgentIntegrationsPanel: {
		name: 'AgentIntegrationsPanel',
		template: '<div data-testid="stub-agent-integrations-panel" />',
		props: ['projectId', 'agentId', 'agentName', 'focusType', 'onlyConnected'],
		emits: ['update:connected-triggers', 'trigger-added'],
	},
	AgentSessionsListView: {
		name: 'AgentSessionsListView',
		template: '<div data-testid="stub-agent-sessions-list-view" />',
	},
	N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size'] },
	N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
	N8nActionDropdown: { template: '<div />' },
	Transition: { template: '<div><slot/></div>' },
};

describe('AgentBuilderView — chat mode toggle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		routerPush.mockReset();
		// Reset to a built agent; tests that need an unbuilt agent override locally.
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = { ...intendedConfig };
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
	});

	it('renders the chat mode toggle with Build selected by default', async () => {
		// Built agents default to Build unless the URL pins a session id; see
		// AgentBuilderView.initialize() for the canonical decision.
		const wrapper = await renderView();

		const toggle = wrapper.find('[data-testid="agent-chat-mode-toggle"]');
		expect(toggle.exists()).toBe(true);
		const vm = wrapper.vm as unknown as { chatMode: string };
		expect(vm.chatMode).toBe('build');
	});

	it('lazy-mounts each chat panel on first activation and toggles visibility via v-show afterwards', async () => {
		// Default mount is Build (see prior test). Switching to Test mounts the
		// test panel for the first time; flipping back to Build keeps both
		// mounted so neither panel re-runs loadHistory() on toggle.
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { activeChatSessionId: string | null };

		const buildPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(buildPanel.exists()).toBe(true);
		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="chat"]').exists()).toBe(
			false,
		);
		expect((buildPanel.element as HTMLElement).style.display).not.toBe('none');

		// Test requires an active session (a real user reaches this by sending
		// a message from the home input). Seed it so the chat panel binds.
		vm.activeChatSessionId = 'test-session-1';
		(wrapper.vm as unknown as { setChatMode: (m: string) => void }).setChatMode('test');
		await nextTick();

		const testPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="chat"]');
		expect(testPanel.exists()).toBe(true);
		expect((buildPanel.element as HTMLElement).style.display).toBe('none');
		expect((testPanel.element as HTMLElement).style.display).not.toBe('none');

		// Switching back to Build should not unmount Test — both panels stay
		// mounted once opened.
		(wrapper.vm as unknown as { setChatMode: (m: string) => void }).setChatMode('build');
		await nextTick();

		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="chat"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]').exists()).toBe(
			true,
		);
		expect((buildPanel.element as HTMLElement).style.display).not.toBe('none');
		expect((testPanel.element as HTMLElement).style.display).toBe('none');
	});

	it('drops unbuilt agents straight into the build chat on load', async () => {
		// Unbuilt agents go to the build chat unconditionally so the build
		// panel mounts, triggers loadHistory, and any prior conversation with
		// the builder is visible instead of being stranded behind the home
		// screen (where the Test tab is locked and clicking Build is a no-op).
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = { ...intendedConfig };

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { chatMode: string };

		// The view no longer has a `mode: 'home' | 'chat'` field — the three-column
		// shell is always visible. We verify only the chat tab selection.
		expect(vm.chatMode).toBe('build');
	});

	it('initialises built agents with the build tab selected', async () => {
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { chatMode: string };

		// The view no longer has a `mode: 'home' | 'chat'` field — the three-column
		// shell is always visible. Built agents default to Build unless the URL
		// pins a session id (see initialize() in AgentBuilderView).
		expect(vm.chatMode).toBe('build');
	});

	it('locks the Test tab when the agent has no instructions', async () => {
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = { ...intendedConfig };
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as { chatMode: string };

		// Get into Build mode first (it's clickable on any agent state).
		(wrapper.vm as unknown as { setChatMode: (m: string) => void }).setChatMode('build');
		await nextTick();
		expect(vm.chatMode).toBe('build');

		// Clicking Test on an unbuilt agent must be a no-op — the RadioButton
		// option is disabled and the click handler returns early.
		(wrapper.vm as unknown as { setChatMode: (m: string) => void }).setChatMode('test');
		await nextTick();
		expect(vm.chatMode).toBe('build');
	});

	it('transitions to test chat when a toggle segment is clicked', async () => {
		// The view defaults to Build for built agents; clicking Test must
		// switch chatMode and mount the test panel.
		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			chatMode: string;
			activeChatSessionId: string | null;
		};

		expect(vm.chatMode).toBe('build');
		// Test mode requires an active session for the panel to bind.
		vm.activeChatSessionId = 'test-session-1';

		(wrapper.vm as unknown as { setChatMode: (m: string) => void }).setChatMode('test');
		await nextTick();

		expect(vm.chatMode).toBe('test');

		const testPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="chat"]');
		expect(testPanel.exists()).toBe(true);
		expect((testPanel.element as HTMLElement).style.display).not.toBe('none');
	});

	it('navigates directly to build chat on startChat for an unbuilt agent', async () => {
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = { ...intendedConfig };

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			chatMode: string;
			startChat: (msg: string) => void;
			isBuilt: boolean;
		};

		// Agent has no instructions — isBuilt should be false.
		expect(vm.isBuilt).toBe(false);

		vm.startChat('Build me a Slack triage agent');
		await nextTick();

		// The three-column shell is always visible (no separate `mode`
		// state machine); startChat just selects the build chat tab.
		expect(vm.chatMode).toBe('build');

		// No progress screen rendered
		expect(wrapper.find('[data-testid="progress-stub"]').exists()).toBe(false);

		// Build chat panel should be visible
		const buildPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(buildPanel.exists()).toBe(true);
	});
});

describe('AgentBuilderView — three-column shell', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		routerPush.mockReset();
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = { ...intendedConfig };
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
	});

	it('renders three columns: chat, tree, editor', async () => {
		const wrapper = await renderView();
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-tree-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
	});

	it('renders the Build/Test toggle inside the chat column', async () => {
		const wrapper = await renderView();
		const chatCol = wrapper.find('[data-testid="agent-builder-chat-column"]');
		expect(chatCol.find('[data-testid="agent-chat-mode-toggle"]').exists()).toBe(true);
	});

	it('does not render the old home content or settings sidebar', async () => {
		const wrapper = await renderView();
		const html = wrapper.html();
		expect(html).not.toContain('agent-home-content');
		expect(html).not.toContain('agent-settings-sidebar');
	});

	it('renders the new top header above the three columns', async () => {
		const wrapper = await renderView();
		expect(wrapper.find('[data-testid="stub-agent-builder-header"]').exists()).toBe(true);
	});

	it('no longer renders the old editor-column action dropdown', async () => {
		const wrapper = await renderView();
		expect(wrapper.find('[data-testid="agent-header-actions"]').exists()).toBe(false);
	});

	it('toggling the chat column from the header updates the header prop + localStorage', async () => {
		window.localStorage.removeItem('agentBuilder.chatColumnCollapsed');
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });
		// Initially not collapsed.
		expect(header.props('chatColumnCollapsed')).toBe(false);
		header.vm.$emit('toggle-chat-column');
		await nextTick();
		await flushPromises();
		// After toggle: the prop passed down to the header must flip to true.
		expect(header.props('chatColumnCollapsed')).toBe(true);
		// The watcher must have persisted the state to localStorage.
		expect(window.localStorage.getItem('agentBuilder.chatColumnCollapsed')).toBe('1');
	});

	it('back event navigates to the project agents list', async () => {
		routerPush.mockClear();
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });
		header.vm.$emit('back');
		await flushPromises();
		expect(routerPush).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'AgentsListView',
				params: { projectId: 'p1' },
			}),
		);
	});
});

/*
 * DROPPED SPECS (no UI entry point in PR1):
 *
 * 1. 'fires User edited agent config with part=name when the agent name is updated'
 *    — relied on AgentHomeContent emitting 'update:name'. AgentHomeContent is
 *    removed from the three-column shell; name editing has no new UI entry point
 *    in PR1. Re-add once a name-edit surface lands in the editor column.
 *
 * 2. 'fires User edited agent config with part=description when the description is updated'
 *    — relied on AgentHomeContent emitting 'update:description'. Same reason as above.
 *
 * 3. 'fires User edited agent config with part=triggers when the connected-triggers list changes'
 *    — relied on AgentSettingsSidebar emitting 'update:connected-triggers'. The
 *    integrations panel is deleted in PR1; triggers telemetry has no new entry point.
 *    Re-add when AgentIntegrationsPanel or equivalent lands.
 *
 * 4. 'does not fire User edited agent config when the connected-triggers list is unchanged'
 *    — same as above.
 */
