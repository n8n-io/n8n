/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep and private-state reads */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import type { AgentJsonSkillRef, AgentJsonToolRef, CustomToolEntry } from '../types';

const routerPush = vi.fn();
const routerReplace = vi.fn();
const routeQuery: Record<string, string | undefined> = {};
const openModalWithDataMock = vi.fn();
const closeModalMock = vi.fn();
const showMessageMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPush, replace: routerReplace }),
	useRoute: () => ({ params: { projectId: 'p1', agentId: 'a1' }, query: routeQuery }),
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
	useToast: () => ({ showError: vi.fn(), showMessage: showMessageMock }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModalWithData: openModalWithDataMock,
		closeModal: closeModalMock,
	}),
}));

const updateAgentMock = vi.fn();
const updateAgentSkillMock = vi.fn();
const createAgentSkillMock = vi.fn();
const getIntegrationStatusMock = vi.fn();
const publishAgentMock = vi.fn();
const getAgentMock = vi.fn();
const sessionThreads: Array<{ id: string; updatedAt: string }> = [];

vi.mock('../composables/useAgentApi', () => ({
	getAgent: getAgentMock,
	updateAgent: updateAgentMock,
	updateAgentSkill: updateAgentSkillMock,
	createAgentSkill: createAgentSkillMock,
	deleteAgent: vi.fn(),
	publishAgent: publishAgentMock,
	getIntegrationStatus: getIntegrationStatusMock,
}));

vi.mock('../composables/useAgentBuilderTelemetry', () => ({
	useAgentBuilderTelemetry: () => ({
		resetForAgentSwitch: vi.fn(),
		captureToolsBaseline: vi.fn(),
		captureSkillsBaseline: vi.fn(),
		fetchInitialTriggersBaseline: vi.fn().mockResolvedValue(null),
		recordConfigEdit: vi.fn(),
		flushConfigEdits: vi.fn(),
		trackToolsAdded: vi.fn(),
		trackSkillsAdded: vi.fn(),
	}),
}));

vi.mock('../composables/useAgentBuilderStatus', () => ({
	useAgentBuilderStatus: () => ({
		isBuilderConfigured: ref(true),
		fetchStatus: vi.fn().mockResolvedValue(undefined),
	}),
}));

// Real ref so the view's `watch(config, ...)` fires and populates `localConfig`.
// Tests that need an unbuilt agent flip this to empty instructions before render.
interface TestAgentConfig {
	name: string;
	instructions: string;
	tools?: AgentJsonToolRef[];
	skills?: AgentJsonSkillRef[];
}

const mockConfig = ref<TestAgentConfig | null>({
	name: 'Agent One',
	instructions: 'You are a helpful assistant.',
});
// Stash the "desired config" separately so the fetchConfig mock can restore
// the ref after `initialize()` clears `localConfig` and re-fetches. Without
// this, the view's `localConfig = null` reset sticks — the config ref hasn't
// changed, so the `watch(config, ...)` listener doesn't re-fire.
let intendedConfig: TestAgentConfig | null = {
	name: 'Agent One',
	instructions: 'You are a helpful assistant.',
};

function makeAgentResponse(overrides: Record<string, unknown> = {}) {
	return {
		id: 'a1',
		name: 'Agent One',
		description: null,
		tools: {},
		skills: {},
		updatedAt: '2026-01-01T00:00:00Z',
		publishedVersion: null,
		versionId: 'v1',
		...overrides,
	};
}

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
		threads: sessionThreads,
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
		'agents.builder.chat.fullWidth.expand.ariaLabel': 'Expand',
		'agents.builder.chat.fullWidth.collapse.ariaLabel': 'Collapse',
		'projects.menu.personal': 'Personal',
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
	const pinia = createPinia();
	setActivePinia(pinia);
	const wrapper = mount(AgentBuilderView, {
		global: {
			plugins: [pinia],
			stubs: commonStubs,
		},
	});
	await flushPromises();
	return wrapper;
}

const commonStubs = {
	AgentChatPanel: {
		name: 'AgentChatPanel',
		template: `
			<div data-testid="chat-panel-stub" :data-endpoint="endpoint">
				<div data-testid="stub-above-input"><slot name="above-input" /></div>
				<div data-testid="stub-footer-start"><slot name="footer-start" /></div>
			</div>
		`,
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
			'<div data-testid="stub-agent-builder-header" :data-project-name="projectName"></div>',
		props: [
			'agent',
			'projectId',
			'agentId',
			'projectName',
			'headerActions',
			'beforeRevertToPublished',
		],
		emits: ['header-action', 'published', 'unpublished', 'reverted', 'switch-agent'],
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
		props: ['config', 'disabled', 'collapsible'],
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
	AgentSkillsListPanel: {
		name: 'AgentSkillsListPanel',
		template: '<div data-testid="stub-agent-skills-list-panel" />',
		props: ['skills', 'disabled'],
		emits: ['open-skill', 'add-skill', 'remove-skill'],
	},
	AgentSkillViewer: {
		name: 'AgentSkillViewer',
		template: '<div data-testid="stub-agent-skill-viewer" />',
		props: ['skill', 'disabled', 'errors'],
		emits: ['update:skill'],
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
	AgentBuilderUnconfiguredEmptyState: {
		name: 'AgentBuilderUnconfiguredEmptyState',
		template: '<div data-testid="stub-agent-builder-unconfigured-empty-state" />',
	},
	N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size'] },
	N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
	N8nActionDropdown: { template: '<div />' },
	Transition: { template: '<div><slot/></div>' },
};

describe('AgentBuilderView — chat mode toggle', () => {
	// First Vite transform of this SFC + design-system deps can exceed the default
	// 5s test timeout; warm the module once so each case measures mount behavior.
	beforeAll(async () => {
		await import('../views/AgentBuilderView.vue');
	}, 30_000);

	beforeEach(() => {
		vi.clearAllMocks();
		routerPush.mockReset();
		routerReplace.mockReset();
		openModalWithDataMock.mockReset();
		closeModalMock.mockReset();
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		sessionThreads.length = 0;
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		// Reset to a built agent; tests that need an unbuilt agent override locally.
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValue(makeAgentResponse());
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

	it('keeps a known continued session selected even when it has no persisted messages', async () => {
		routeQuery.continueSessionId = 'faulty-thread';
		sessionThreads.push({ id: 'faulty-thread', updatedAt: '2026-01-01T00:00:00Z' });

		const wrapper = await renderView();
		routerReplace.mockClear();

		(wrapper.vm as unknown as { onContinueLoaded: (count: number) => void }).onContinueLoaded(0);
		await nextTick();
		await flushPromises();

		expect(routerReplace).not.toHaveBeenCalled();
		expect((wrapper.vm as unknown as { chatMode: string }).chatMode).toBe('test');
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
		routerReplace.mockReset();
		openModalWithDataMock.mockReset();
		closeModalMock.mockReset();
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		sessionThreads.length = 0;
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValue(makeAgentResponse());
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
	});

	it('renders the two-column shell: chat and editor', async () => {
		const wrapper = await renderView();
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
	});

	it('hides the editor column when the chat full-width toggle is enabled', async () => {
		const wrapper = await renderView();

		const chatColumn = wrapper.findComponent({ name: 'AgentBuilderChatColumn' });
		chatColumn.vm.$emit('update:full-width', true);
		await nextTick();

		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(false);
		expect(chatColumn.props('isFullWidth')).toBe(true);

		wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).vm.$emit('update:full-width', false);
		await nextTick();

		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).props('isFullWidth')).toBe(
			false,
		);
	});

	it('renders a floating full-width toggle in build chat mode', async () => {
		const wrapper = await renderView();

		expect(wrapper.find('[data-testid="agent-build-chat-full-width-toggle"]').exists()).toBe(true);
	});

	it('renders the Build/Test toggle inside the chat input footer', async () => {
		const wrapper = await renderView();
		const chatPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(
			chatPanel
				.find('[data-testid="stub-footer-start"] [data-testid="agent-chat-mode-toggle"]')
				.exists(),
		).toBe(true);
		expect(
			chatPanel
				.find('[data-testid="stub-above-input"] [data-testid="agent-chat-mode-toggle"]')
				.exists(),
		).toBe(false);
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

	it('passes the personal label instead of the personal project owner name', async () => {
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });
		expect(header.props('projectName')).toBe('Personal');
	});

	it('opens the tool config modal with the custom tool source', async () => {
		const customTool: CustomToolEntry = {
			code: 'export async function run() {\n\treturn "ok";\n}',
			descriptor: {
				name: 'Lookup customer',
				description: 'Finds a customer',
				systemInstruction: null,
				inputSchema: null,
				outputSchema: null,
				hasSuspend: false,
				hasResume: false,
				hasToMessage: false,
				requireApproval: false,
				providerOptions: null,
			},
		};
		const toolRef: AgentJsonToolRef = { type: 'custom', id: 'custom_tool' };
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			tools: [toolRef],
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				tools: {
					custom_tool: customTool,
				},
			}),
		);

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).vm.$emit('open-tool', 0);
		await nextTick();

		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'agentToolConfigModal',
				data: expect.objectContaining({
					toolRef,
					customTool,
				}),
			}),
		);
	});

	it('shows applied skills and opens a skill modal from the capabilities section', async () => {
		const skill = {
			name: 'summarize_notes',
			description: 'Summarize notes before replying',
			instructions: 'Read the notes and produce a concise summary.',
		};
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				skills: {
					summarize_notes: skill,
				},
			}),
		);

		const wrapper = await renderView();

		const capabilities = wrapper.findComponent({ name: 'AgentCapabilitiesSection' });
		expect(capabilities.exists()).toBe(true);
		expect(capabilities.props('skills')).toEqual([{ id: 'summarize_notes', skill }]);

		capabilities.vm.$emit('open-skill', 'summarize_notes');
		await nextTick();

		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'agentSkillModal',
				data: expect.objectContaining({
					skill,
					skillId: 'summarize_notes',
				}),
			}),
		);
	});

	it('removes an applied skill from the config skills list', async () => {
		const skill = {
			name: 'summarize_notes',
			description: 'Use when summarizing notes',
			instructions: 'Read the notes and produce a concise summary.',
		};
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			tools: [{ type: 'custom', id: 'custom_tool' }],
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				skills: {
					summarize_notes: skill,
				},
			}),
		);

		const wrapper = await renderView();
		wrapper
			.findComponent({ name: 'AgentCapabilitiesSection' })
			.vm.$emit('remove-skill', 'summarize_notes');
		await nextTick();

		const vm = wrapper.vm as unknown as {
			localConfig: { tools?: AgentJsonToolRef[]; skills?: AgentJsonSkillRef[] };
		};
		expect(vm.localConfig.tools).toEqual([{ type: 'custom', id: 'custom_tool' }]);
		expect(vm.localConfig.skills).toEqual([]);
		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).props('skills')).toEqual([]);
	});

	it('opens the add skill modal and applies the created skill', async () => {
		const skill = {
			name: 'Summarize Meetings',
			description: 'Use when summarizing meeting notes',
			instructions: 'Extract decisions and action items.',
		};
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			tools: [{ type: 'custom', id: 'custom_tool' }],
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValueOnce(makeAgentResponse({ skills: {} }));
		createAgentSkillMock.mockResolvedValueOnce({
			id: 'skill_0Ab9ZkLm3Pq7Xy2N',
			skill,
			versionId: 'v2',
		});

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).vm.$emit('add-skill');
		await nextTick();

		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'agentSkillModal',
				data: expect.objectContaining({
					projectId: 'p1',
					agentId: 'a1',
				}),
			}),
		);

		const modalData = openModalWithDataMock.mock.calls[0][0].data as {
			onConfirm: (payload: { skill: typeof skill }) => void;
		};
		modalData.onConfirm({ skill });
		await flushPromises();
		await nextTick();

		const vm = wrapper.vm as unknown as {
			localConfig: { tools?: AgentJsonToolRef[]; skills?: AgentJsonSkillRef[] };
		};
		expect(vm.localConfig.tools).toEqual([{ type: 'custom', id: 'custom_tool' }]);
		expect(vm.localConfig.skills).toEqual([{ type: 'skill', id: 'skill_0Ab9ZkLm3Pq7Xy2N' }]);
		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).props('skills')).toEqual([
			{ id: 'skill_0Ab9ZkLm3Pq7Xy2N', skill },
		]);
		expect(showMessageMock).toHaveBeenCalledWith({
			title: 'agents.builder.skills.added',
			type: 'success',
		});
	});

	it('applies skill modal edits to the local config and agent resource', async () => {
		const skill = {
			name: 'summarize_notes',
			description: 'Use when summarizing notes',
			instructions: 'Read the notes and produce a concise summary.',
		};
		const updatedSkill = {
			name: 'meeting_summary',
			description: 'Use when extracting decisions from meeting notes',
			instructions: 'Extract decisions, risks, and action items.',
		};
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		};
		mockConfig.value = { ...intendedConfig };
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				skills: {
					summarize_notes: skill,
				},
			}),
		);

		const wrapper = await renderView();
		wrapper
			.findComponent({ name: 'AgentCapabilitiesSection' })
			.vm.$emit('open-skill', 'summarize_notes');
		await nextTick();

		const modalData = openModalWithDataMock.mock.calls[0][0].data as {
			onConfirm: (payload: { id: string; skill: typeof updatedSkill }) => void;
		};
		modalData.onConfirm({ id: 'summarize_notes', skill: updatedSkill });
		await nextTick();

		expect(updateAgentSkillMock).not.toHaveBeenCalled();
		expect(
			(wrapper.vm as unknown as { agent: { skills: Record<string, unknown> } }).agent.skills,
		).toEqual({
			summarize_notes: updatedSkill,
		});
		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).props('skills')).toEqual([
			{ id: 'summarize_notes', skill: updatedSkill },
		]);
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
