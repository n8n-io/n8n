/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep and private-state reads */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref, computed, reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type {
	AgentJsonConfig,
	AgentJsonSkillRef,
	AgentJsonToolRef,
	AgentFixWithAssistantEvent,
	CustomToolEntry,
} from '../types';
import { getRandomAgentPersonalisationGradient } from '@n8n/api-types';
import { agentsEventBus } from '../agents.eventBus';

const routerPush = vi.fn();
const routerReplace = vi.fn();
const routerResolve = vi.fn((to: { name?: string; params?: Record<string, string> }) => ({
	href: `/${to.name ?? ''}/${Object.values(to.params ?? {}).join('/')}`,
}));
const routeQuery = reactive<Record<string, string | undefined>>({});
let routeName = 'AgentBuilderView';
const openModalWithDataMock = vi.fn();
const closeModalMock = vi.fn();
const showMessageMock = vi.fn();
const showErrorMock = vi.fn();
const sendPreviewSessionToInstanceAiMock = vi.fn();
let createObjectURLSpy: ReturnType<typeof vi.spyOn> | undefined;
let revokeObjectURLSpy: ReturnType<typeof vi.spyOn> | undefined;
let anchorClickSpy: ReturnType<typeof vi.spyOn> | undefined;
const {
	fetchAllCredentialsForWorkflowMock,
	fetchAllCredentialsMock,
	fetchCredentialTypesMock,
	setCredentialsMock,
	agentPermissionsMock,
} = vi.hoisted(() => ({
	fetchAllCredentialsForWorkflowMock: vi.fn().mockResolvedValue(undefined),
	fetchAllCredentialsMock: vi.fn().mockResolvedValue(undefined),
	fetchCredentialTypesMock: vi.fn().mockResolvedValue(undefined),
	setCredentialsMock: vi.fn(),
	agentPermissionsMock: {
		canCreate: { value: true },
		canUpdate: { value: true },
		canDelete: { value: false },
		canPublish: { value: true },
		canUnpublish: { value: true },
	},
}));
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPush,
		replace: routerReplace,
		resolve: routerResolve,
	}),
	useRoute: () => ({
		name: routeName,
		params: { projectId: 'p1', agentId: 'a1' },
		query: routeQuery,
	}),
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
		allCredentials: [],
		getCredentialsByType: () => [],
		fetchAllCredentials: fetchAllCredentialsMock,
		fetchAllCredentialsForWorkflow: fetchAllCredentialsForWorkflowMock,
		fetchCredentialTypes: fetchCredentialTypesMock,
		setCredentials: setCredentialsMock,
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAgentPreviewHandoff', () => ({
	useInstanceAiAgentPreviewHandoff: () => ({
		canSendPreviewToInstanceAi: ref(true),
		sendPreviewSessionToInstanceAi: sendPreviewSessionToInstanceAiMock,
	}),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
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
const createAgentMock = vi.fn();
const updateConfigMock = vi.fn();
const fetchConfigMock = vi.fn();
const repointConfigMock = vi.fn();
const deleteAgentMock = vi.fn().mockResolvedValue(undefined);
const listAgentFilesMock = vi.fn().mockResolvedValue([]);
const uploadAgentFilesMock = vi.fn().mockResolvedValue([]);
const warmAgentKnowledgeSandboxMock = vi.fn().mockResolvedValue({ accepted: true });
const getAgentConfigValidationMock = vi.fn().mockResolvedValue({ status: 'valid', issues: [] });
interface SessionThread {
	id: string;
	updatedAt: string;
	title?: string | null;
	firstMessage?: string | null;
	sessionNumber?: number;
}
const sessionThreads = reactive<SessionThread[]>([]);
const fetchedSessionThreads: SessionThread[] = [];
const fetchSessionThreadsMock = vi.fn().mockImplementation(async () => {
	sessionThreads.splice(0, sessionThreads.length, ...fetchedSessionThreads);
});
const getSessionThreadDetailMock = vi.fn().mockResolvedValue({ executions: [] });
const upsertSessionThreadMock = vi.fn((thread: (typeof sessionThreads)[number]) => {
	const index = sessionThreads.findIndex(({ id }) => id === thread.id);
	if (index === -1) sessionThreads.push(thread);
	else sessionThreads.splice(index, 1, thread);
});
const resetSessionStoreMock = vi.fn(() => {
	sessionThreads.length = 0;
});
const startSessionAutoRefreshMock = vi.fn();
const stopSessionAutoRefreshMock = vi.fn();

vi.mock('../composables/useAgentApi', () => ({
	getAgent: getAgentMock,
	createAgent: createAgentMock,
	updateAgent: updateAgentMock,
	updateAgentSkill: updateAgentSkillMock,
	createAgentSkill: createAgentSkillMock,
	deleteAgent: deleteAgentMock,
	publishAgent: publishAgentMock,
	getIntegrationStatus: getIntegrationStatusMock,
	getModelCatalog: vi.fn().mockResolvedValue({}),
	listAgentFiles: listAgentFilesMock,
	uploadAgentFiles: uploadAgentFilesMock,
	deleteAgentFile: vi.fn(),
	warmAgentKnowledgeSandbox: warmAgentKnowledgeSandboxMock,
	getAgentConfigValidation: getAgentConfigValidationMock,
}));

const generateDraftCasesMock = vi.fn();
vi.mock('../agentEvals.api', () => ({
	getDatasets: vi.fn().mockResolvedValue([]),
	generateDraftCases: (...args: unknown[]) => generateDraftCasesMock(...args),
}));

const agentEvalsFlagMock = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/features/ai/evaluation.ee/composables/useAgentEvalsFlag', () => ({
	useAgentEvalsFlag: () => ({
		get value() {
			return agentEvalsFlagMock.enabled;
		},
	}),
}));

const builderTelemetryMock = vi.hoisted(() => ({
	fetchInitialTriggersBaseline: vi.fn().mockResolvedValue(null),
	trackTriggerAdded: vi.fn(),
	trackOpenedToolFromList: vi.fn(),
	trackOpenedSkillFromList: vi.fn(),
	trackOpenedAddSkillModal: vi.fn(),
}));

vi.mock('../composables/useAgentBuilderTelemetry', () => ({
	useAgentBuilderTelemetry: () => builderTelemetryMock,
}));

vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => agentPermissionsMock,
}));

const favoritesStoreMock = vi.hoisted(() => ({
	isFavorite: vi.fn(() => false),
	toggleFavorite: vi.fn().mockResolvedValue(undefined),
	renameFavorite: vi.fn(),
	removeFavoriteLocally: vi.fn(),
}));

vi.mock('@/app/stores/favorites.store', () => ({
	useFavoritesStore: () => favoritesStoreMock,
}));

// Real ref so the view's `watch(config, ...)` fires and populates `localConfig`.
// Tests that need an unbuilt agent flip this to empty instructions before render.
interface TestAgentConfig {
	name: string;
	instructions: string;
	model?: string;
	credential?: string;
	tools?: AgentJsonToolRef[];
	skills?: AgentJsonSkillRef[];
	personalisation?: AgentJsonConfig['personalisation'];
}

const defaultLlmConfig = {
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'cred-anthropic',
} as const;

function testPersonalisation(): AgentJsonConfig['personalisation'] {
	return {
		icon: 'bot',
		gradient: {
			from: '#111111',
			to: '#222222',
			angle: 135,
			fromStop: 0,
			toStop: 100,
		},
	};
}

function withDefaultLlm(config: TestAgentConfig | null): TestAgentConfig | null {
	return config ? { ...defaultLlmConfig, personalisation: testPersonalisation(), ...config } : null;
}

const mockConfig = ref<TestAgentConfig | null>(
	withDefaultLlm({
		name: 'Agent One',
		instructions: 'You are a helpful assistant.',
	}),
);
// Stash the "desired config" separately so the fetchConfig mock can restore
// the ref after `initialize()` clears `localConfig` and re-fetches. Without
// this, the view's `localConfig = null` reset sticks — the config ref hasn't
// changed, so the `watch(config, ...)` listener doesn't re-fire.
let intendedConfig: TestAgentConfig | null = {
	name: 'Agent One',
	...defaultLlmConfig,
	instructions: 'You are a helpful assistant.',
};

function makeAgentResponse(overrides: Record<string, unknown> = {}) {
	return {
		id: 'a1',
		name: 'Agent One',
		tools: {},
		skills: {},
		updatedAt: '2026-01-01T00:00:00Z',
		activeVersionId: null,
		activeVersion: null,
		versionId: 'v1',
		isRunnable: true,
		...overrides,
	};
}

vi.mock('../composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: mockConfig,
		fetchConfig: fetchConfigMock.mockImplementation(async () => {
			// Mimic the real composable: re-publish the fetched config by touching
			// the ref, which triggers watchers even when the shape is unchanged.
			mockConfig.value = withDefaultLlm(intendedConfig);
		}),
		updateConfig: updateConfigMock,
		repoint: repointConfigMock,
	}),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: sessionThreads,
		loading: false,
		fetchThreads: fetchSessionThreadsMock,
		getThreadDetail: getSessionThreadDetailMock,
		upsertThread: upsertSessionThreadMock,
		startAutoRefresh: startSessionAutoRefreshMock,
		stopAutoRefresh: stopSessionAutoRefreshMock,
		reset: resetSessionStoreMock,
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
	upsertProjectAgentsListCache: vi.fn(),
	removeProjectAgentFromListCache: vi.fn(),
}));

const instanceAiAvailableRef = ref(true);
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => instanceAiAvailableRef.value),
}));

const startInstanceAiThread = vi.fn();
const openAgentArtifactThread = vi.fn();
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({
		startThread: startInstanceAiThread,
		openAgentArtifactThread,
	}),
}));

const baseTextFn = (key: string, options?: { interpolate?: Record<string, string | number> }) => {
	const map: Record<string, string> = {
		'agents.builder.preview.button': 'Preview',
		'agents.builder.preview.close.ariaLabel': 'Close preview',
		'projects.menu.personal': 'Personal',
	};
	if (key === 'agents.builder.preview.fixWithAssistantPrompt.template') {
		return `Review these failed tool calls, identify the root cause, fix the agent, and verify the change.

${String(options?.interpolate?.diagnostics ?? '')}
`;
	}
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
async function renderView({
	knowledgeBaseEnabled = false,
	waitForAsyncSetup = true,
	props,
	seedStores,
}: {
	knowledgeBaseEnabled?: boolean;
	waitForAsyncSetup?: boolean;
	props?: Record<string, unknown>;
	/** Runs against the fresh pinia before mount, for state the view reads on setup. */
	seedStores?: () => void;
} = {}) {
	const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
	const pinia = createPinia();
	setActivePinia(pinia);
	const { useSettingsStore } = await import('@n8n/stores/settings.store');
	const settingsStore = useSettingsStore();
	settingsStore.settings = { activeModules: knowledgeBaseEnabled ? ['agents'] : [] } as never;
	settingsStore.moduleSettings = {
		agents: {
			modules: [],
			knowledgeBaseEnabled,
			proxyEnabled: false,
		},
	};
	seedStores?.();
	const wrapper = mount(AgentBuilderView, {
		props,
		global: {
			plugins: [pinia],
			stubs: commonStubs,
		},
	});
	mountedWrappers.push(wrapper);
	if (waitForAsyncSetup) await flushPromises();
	return wrapper;
}

const mountedWrappers: Array<ReturnType<typeof mount>> = [];

// Unmount every view mounted by the test and drain its async tail. Without
// this, a still-mounted view's pending debounce timers and in-flight save
// chains keep running into later tests, where they consume shared mock
// `*Once` queues and emit bus events against the next test's component.
// A second unmount after a test's own `wrapper.unmount()` is a no-op.
afterEach(async () => {
	for (const wrapper of mountedWrappers.splice(0)) {
		wrapper.unmount();
	}
	await flushPromises();
});

async function startArtifactPreviewSend(
	wrapper: Awaited<ReturnType<typeof renderView>>,
	sessionId: string,
) {
	(
		wrapper.vm as unknown as { openArtifactPreview: (sessionId?: string) => void }
	).openArtifactPreview(sessionId);
	await nextTick();
	const beforeSend = wrapper
		.findComponent({ name: 'AgentPreviewDock' })
		.props('beforeSend') as () => Promise<void>;
	return { pending: beforeSend() };
}

async function readBlobText(blob: Blob): Promise<string> {
	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
		reader.onerror = () => reject(reader.error);
		reader.readAsText(blob);
	});
}

const commonStubs = {
	AgentChatPanel: {
		name: 'AgentChatPanel',
		template: `
			<div data-testid="chat-panel-stub">
				<div data-testid="stub-footer-start"><slot name="footer-start" /></div>
			</div>
		`,
		props: [
			'projectId',
			'agentId',
			'mode',
			'agentConfig',
			'agentStatus',
			'connectedTriggers',
			'continueSessionId',
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
	AgentBuilderHeader: {
		name: 'AgentBuilderHeader',
		template:
			'<div data-testid="stub-agent-builder-header" :data-project-name="projectName" :data-artifact-mode="String(artifactMode)" :data-config-validation-status="String(configValidationStatus)" :data-save-status="String(saveStatus)"></div>',
		props: [
			'agent',
			'projectId',
			'agentId',
			'projectName',
			'headerActions',
			'beforeRevertToPublished',
			'artifactMode',
			'isPreviewOpen',
			'configValidationStatus',
			'saveStatus',
			'beforePublish',
		],
		emits: [
			'header-action',
			'open-preview',
			'close-preview',
			'published',
			'unpublished',
			'reverted',
			'switch-agent',
			'toggle-version-history',
		],
	},
	AgentPreviewHeader: {
		name: 'AgentPreviewHeader',
		template: '<header data-testid="stub-agent-preview-header" />',
		props: ['agentName', 'agentHref', 'sessionTitle', 'sessionOptions', 'hasTrace'],
		emits: ['back', 'new-session', 'session-select', 'view-trace'],
	},
	AgentPreviewChatPage: {
		name: 'AgentPreviewChatPage',
		template: '<main data-testid="stub-agent-preview-chat-page" />',
		props: [
			'initialized',
			'projectId',
			'agentId',
			'agent',
			'localConfig',
			'connectedTriggers',
			'effectiveSessionId',
			'canSendToAssistant',
			'beforeSend',
		],
		emits: ['continue-loaded', 'send-to-assistant'],
	},
	AgentPreviewDock: {
		name: 'AgentPreviewDock',
		template: '<aside data-testid="stub-agent-preview-dock" />',
		props: [
			'isOpen',
			'sessionTitle',
			'hasSession',
			'initialized',
			'projectId',
			'agentId',
			'agent',
			'localConfig',
			'connectedTriggers',
			'effectiveSessionId',
			'initialPrompt',
			'canSendToAssistant',
			'beforeSend',
		],
		emits: [
			'view-trace',
			'new-session',
			'close',
			'continue-loaded',
			'open-build',
			'send-to-assistant',
		],
	},
	AgentVersionHistoryPanel: {
		name: 'AgentVersionHistoryPanel',
		template: '<aside />',
	},
	// Stub each panel that the editor column dispatches to. These panels pull
	// in stores / composables (users, credentials, sessions list)
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
	AgentSkillsListPanel: {
		name: 'AgentSkillsListPanel',
		template: '<div data-testid="stub-agent-skills-list-panel" />',
		props: ['skills', 'disabled'],
		emits: ['open-skill', 'add-skill', 'remove-skill'],
	},
	AgentSubAgentsPanel: {
		name: 'AgentSubAgentsPanel',
		template: '<div data-testid="stub-agent-sub-agents-panel" />',
		props: ['config', 'disabled', 'projectId', 'agentId'],
		emits: ['update:config'],
	},
	AgentSkillViewer: {
		name: 'AgentSkillViewer',
		template: '<div data-testid="stub-agent-skill-viewer" />',
		props: ['skill', 'disabled', 'errors'],
		emits: ['update:skill'],
	},
	AgentSessionsListView: {
		name: 'AgentSessionsListView',
		template: '<div data-testid="stub-agent-sessions-list-view" />',
		props: ['embedded', 'projectId', 'agentId', 'manageStoreLifecycle'],
	},
	N8nButton: {
		template:
			'<button v-bind="$attrs" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
		emits: ['click'],
	},
	N8nAssistantIcon: { template: '<i data-testid="stub-assistant-icon" />', props: ['size'] },
	N8nTooltip: {
		template: '<span data-testid="stub-tooltip"><slot /></span>',
		props: ['placement', 'content'],
	},
	N8nIcon: {
		template: '<i v-bind="$attrs" :data-icon="icon"></i>',
		props: ['icon', 'size', 'spin'],
	},
	N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
	N8nActionDropdown: { template: '<div />' },
	Transition: { template: '<div><slot/></div>' },
};

// Common reset shared by every describe block below. Each describe's own
// beforeEach calls this first, then applies its own divergent setup
// (permission defaults, spy restoration, or mocks it alone exercises).
function resetViewMocks() {
	vi.clearAllMocks();
	for (let index = localStorage.length - 1; index >= 0; index--) {
		const key = localStorage.key(index);
		if (key?.startsWith('N8N_AGENT_PREVIEW_OPEN')) localStorage.removeItem(key);
	}
	routerPush.mockReset();
	routerReplace.mockReset();
	routerResolve.mockClear();
	fetchSessionThreadsMock.mockReset();
	fetchSessionThreadsMock.mockImplementation(async () => {
		sessionThreads.splice(0, sessionThreads.length, ...fetchedSessionThreads);
	});
	getSessionThreadDetailMock.mockReset();
	getSessionThreadDetailMock.mockResolvedValue({ executions: [] });
	resetSessionStoreMock.mockClear();
	startSessionAutoRefreshMock.mockReset();
	stopSessionAutoRefreshMock.mockReset();
	openModalWithDataMock.mockReset();
	closeModalMock.mockReset();
	routeName = 'AgentBuilderView';
	agentEvalsFlagMock.enabled = false;
	generateDraftCasesMock.mockReset();
	generateDraftCasesMock.mockResolvedValue({ cases: [] });
	for (const key of Object.keys(routeQuery)) delete routeQuery[key];
	sessionThreads.length = 0;
	fetchedSessionThreads.length = 0;
	sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
	// Reset to a built agent; tests that need an unbuilt agent override locally.
	intendedConfig = {
		name: 'Agent One',
		instructions: 'You are a helpful assistant.',
	};
	mockConfig.value = withDefaultLlm(intendedConfig);
	updateConfigMock.mockReset();
	updateConfigMock.mockResolvedValue({ versionId: 'v1', stale: false });
	repointConfigMock.mockReset();
	getAgentMock.mockResolvedValue(makeAgentResponse());
	createAgentMock.mockReset();
	createAgentMock.mockResolvedValue(makeAgentResponse({ id: 'aBcDeFgHiJkLmNoP' }));
	getIntegrationStatusMock.mockResolvedValue({ status: 'connected', integrations: [] });
	getAgentConfigValidationMock.mockReset();
	getAgentConfigValidationMock.mockResolvedValue({ status: 'valid', issues: [] });
	listAgentFilesMock.mockReset();
	listAgentFilesMock.mockResolvedValue([]);
	uploadAgentFilesMock.mockReset();
	uploadAgentFilesMock.mockResolvedValue([]);
	showErrorMock.mockReset();
	fetchConfigMock.mockClear();
	builderTelemetryMock.fetchInitialTriggersBaseline.mockResolvedValue(null);
	favoritesStoreMock.isFavorite.mockReturnValue(false);
	instanceAiAvailableRef.value = true;
	startInstanceAiThread.mockReset();
	openAgentArtifactThread.mockReset();
}

// First Vite transform of this SFC + design-system deps can exceed the default
// 5s test timeout; Provide a hefty timeout for this block to evade flakes due to pressure on machine
describe('AgentBuilderView — preview routing', { timeout: 60_000 }, () => {
	beforeEach(() => {
		resetViewMocks();
		vi.restoreAllMocks();
		createObjectURLSpy?.mockRestore();
		revokeObjectURLSpy?.mockRestore();
		anchorClickSpy?.mockRestore();
		createObjectURLSpy = undefined;
		revokeObjectURLSpy = undefined;
		anchorClickSpy = undefined;
		agentPermissionsMock.canCreate.value = true;
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canDelete.value = false;
		agentPermissionsMock.canPublish.value = true;
		agentPermissionsMock.canUnpublish.value = true;
		deleteAgentMock.mockReset();
		deleteAgentMock.mockResolvedValue(undefined);
		warmAgentKnowledgeSandboxMock.mockClear();
		favoritesStoreMock.toggleFavorite.mockClear();
		favoritesStoreMock.renameFavorite.mockClear();
		favoritesStoreMock.removeFavoriteLocally.mockClear();
	});

	it('renders the manual editor without an agents-page build chat', async () => {
		const wrapper = await renderView();

		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-chat-mode-toggle"]').exists()).toBe(false);
	});

	it('loads credentials through the workflow-scoped credentials endpoint for the agent project', async () => {
		await renderView();

		expect(setCredentialsMock).toHaveBeenCalledWith([]);
		expect(fetchAllCredentialsForWorkflowMock).toHaveBeenCalledWith({ projectId: 'p1' });
		expect(fetchAllCredentialsMock).not.toHaveBeenCalled();
	});

	it('persists a generated personalisation gradient when an existing agent is missing one', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		const expectedGradient = getRandomAgentPersonalisationGradient(() => 0.5);
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			personalisation: undefined,
		};
		mockConfig.value = withDefaultLlm(intendedConfig);

		const wrapper = await renderView();
		await (wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave();

		expect(updateConfigMock).toHaveBeenCalledWith(
			'p1',
			'a1',
			expect.objectContaining({
				personalisation: {
					icon: 'bot',
					gradient: expectedGradient,
				},
			}),
		);
	});

	it('does not persist generated personalisation gradients for read-only agents', async () => {
		agentPermissionsMock.canUpdate.value = false;
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			personalisation: undefined,
		};
		mockConfig.value = withDefaultLlm(intendedConfig);

		const wrapper = await renderView();
		await (wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave();

		expect(updateConfigMock).not.toHaveBeenCalled();
	});

	it('reloads task bodies after reverting to a published version', async () => {
		const wrapper = await renderView();
		const editor = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
		expect(editor.props('tasksReloadKey')).toBe(0);

		wrapper
			.findComponent({ name: 'AgentBuilderHeader' })
			.vm.$emit('reverted', makeAgentResponse({ activeVersionId: 'published-version' }));
		await flushPromises();

		expect(fetchConfigMock).toHaveBeenCalledWith('p1', 'a1');
		expect(
			wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).props('tasksReloadKey'),
		).toBe(1);
	});

	it('renders the standalone preview on the direct preview route', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'thread-1';
		const wrapper = await renderView();
		sessionThreads.push({
			id: 'thread-1',
			title: 'Support session',
			updatedAt: '2026-01-01T00:00:00Z',
		});
		await nextTick();
		const header = wrapper.findComponent({ name: 'AgentPreviewHeader' });
		const preview = wrapper.findComponent({ name: 'AgentPreviewChatPage' });

		expect(wrapper.findComponent({ name: 'AgentBuilderHeader' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).exists()).toBe(false);
		expect(header.props()).toEqual(
			expect.objectContaining({
				agentName: 'Agent One',
				agentHref: '/AgentBuilderView/p1/a1',
				sessionTitle: 'Support session',
				hasTrace: true,
			}),
		);
		expect(preview.props()).toEqual(
			expect.objectContaining({
				effectiveSessionId: 'thread-1',
				projectId: 'p1',
				agentId: 'a1',
			}),
		);
		expect(wrapper.emitted('preview-open-change')).toEqual([[false]]);
	});

	it('returns to the builder when leaving preview opened from Sessions', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'thread-1';
		routeQuery.section = '__executions';

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentPreviewHeader' }).vm.$emit('back');
		await flushPromises();

		expect(routerPush).toHaveBeenCalledExactlyOnceWith('/AgentBuilderView/p1/a1');
	});

	it('returns to the plain builder when closing preview without a sessions section', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'thread-1';

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentPreviewHeader' }).vm.$emit('back');
		await flushPromises();

		expect(routerPush).toHaveBeenCalledExactlyOnceWith('/AgentBuilderView/p1/a1');
	});

	it('opens the persisted Preview session trace in the full-page trace view', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'thread-1';
		const wrapper = await renderView();
		sessionThreads.push({ id: 'thread-1', updatedAt: '2026-01-01T00:00:00Z' });
		await nextTick();
		const header = wrapper.findComponent({ name: 'AgentPreviewHeader' });
		const preview = wrapper.findComponent({ name: 'AgentPreviewChatPage' });
		preview.vm.$emit('continue-loaded', { sessionId: 'thread-1', count: 1 });
		await flushPromises();
		routerPush.mockClear();
		routerReplace.mockClear();

		header.vm.$emit('view-trace');
		await flushPromises();

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: 'AgentSessionDetailView',
			params: { projectId: 'p1', agentId: 'a1', threadId: 'thread-1' },
		});
		expect(routerReplace).not.toHaveBeenCalled();
	});

	it('does not mount editor panels on the standalone preview route', async () => {
		routeName = 'AgentPreviewView';
		const wrapper = await renderView();

		expect(wrapper.findComponent({ name: 'AgentPreviewChatPage' }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentVersionHistoryPanel' }).exists()).toBe(false);
		expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).exists()).toBe(false);
	});

	const fixEvent: AgentFixWithAssistantEvent = {
		executionId: 'exec-turn-1',
		failures: [
			{
				toolCallId: 'call-1',
				toolName: 'data_table_get_rows',
				toolDisplayName: 'Get rows from Data Table',
				error: 'Column "status" does not exist',
			},
			{
				toolCallId: 'call-2',
				toolName: 'data_table_update_row',
				toolDisplayName: 'Update row in Data Table',
				error: 'Column "status" does not exist',
			},
		],
	};

	it.each([
		{ label: 'without execution context', event: undefined },
		{ label: 'with execution context', event: fixEvent },
	])('sends the active preview session to Instance AI $label', async ({ event }) => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'thread-1';
		fetchedSessionThreads.push({
			id: 'thread-1',
			updatedAt: '2026-01-01T00:00:00Z',
			title: 'Failed order lookup',
			sessionNumber: 7,
		});

		const wrapper = await renderView();
		const preview = wrapper.findComponent({ name: 'AgentPreviewChatPage' });

		expect(preview.props('canSendToAssistant')).toBe(true);
		preview.vm.$emit('send-to-assistant', event);
		await flushPromises();

		expect(sendPreviewSessionToInstanceAiMock).toHaveBeenCalledWith({
			projectId: 'p1',
			agentId: 'a1',
			threadId: 'thread-1',
			agentName: 'Agent One',
			agentIcon: 'bot',
			sessionTitle: 'Failed order lookup',
			...(event
				? {
						executionId: event.executionId,
						initialDraft: expect.any(String),
					}
				: {}),
		});

		if (event) {
			const initialDraft = sendPreviewSessionToInstanceAiMock.mock.calls[0]?.[0]?.initialDraft;
			expect(initialDraft).toContain(
				'Review these failed tool calls, identify the root cause, fix the agent, and verify the change.',
			);
			expect(initialDraft).toContain('Agent One');
			expect(initialDraft).toContain('Failed order lookup');
			expect(initialDraft).toContain('thread-1');
			expect(initialDraft).toContain('exec-turn-1');
			expect(initialDraft).toContain('Get rows from Data Table');
			expect(initialDraft).toContain('Update row in Data Table');
			expect(initialDraft?.match(/Column \\"status\\" does not exist/g)).toHaveLength(1);
		}
	});

	it('keeps an artifact on the selected preview session and stages the handoff in its Assistant thread', async () => {
		fetchedSessionThreads.push(
			{
				id: 'thread-latest',
				updatedAt: '2026-01-02T00:00:00Z',
				title: 'Latest session',
			},
			{
				id: 'thread-1',
				updatedAt: '2026-01-01T00:00:00Z',
				title: 'Failed order lookup',
				sessionNumber: 7,
			},
		);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactPreviewSessionId: 'thread-1',
			},
		});
		const preview = wrapper.findComponent({ name: 'AgentPreviewDock' });

		expect(preview.props('effectiveSessionId')).toBe('thread-1');
		preview.vm.$emit('send-to-assistant', fixEvent);
		await flushPromises();

		expect(sendPreviewSessionToInstanceAiMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('assistant-handoff')).toEqual([
			[
				expect.objectContaining({
					projectId: 'p2',
					agentId: 'a2',
					threadId: 'thread-1',
					sessionTitle: 'Failed order lookup',
					executionId: 'exec-turn-1',
					initialDraft: expect.stringContaining(
						'Review these failed tool calls, identify the root cause, fix the agent, and verify the change.',
					),
				}),
			],
		]);
	});

	it('restores a preview session that arrives while the artifact is initializing', async () => {
		fetchedSessionThreads.push(
			{ id: 'thread-latest', updatedAt: '2026-01-02T00:00:00Z' },
			{ id: 'thread-1', updatedAt: '2026-01-01T00:00:00Z' },
		);
		const wrapper = await renderView({
			waitForAsyncSetup: false,
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});

		await wrapper.setProps({ artifactPreviewSessionId: 'thread-1' });
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props('effectiveSessionId')).toBe(
			'thread-1',
		);
	});

	it('falls back from an unavailable persisted artifact preview session', async () => {
		fetchedSessionThreads.push({ id: 'thread-latest', updatedAt: '2026-01-02T00:00:00Z' });
		getSessionThreadDetailMock.mockRejectedValueOnce({ httpStatusCode: 404 });
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactPreviewSessionId: 'missing-thread',
			},
		});

		await vi.waitFor(() =>
			expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props('effectiveSessionId')).toBe(
				'thread-latest',
			),
		);
		expect(getSessionThreadDetailMock).toHaveBeenCalledWith('p2', 'a2', 'missing-thread');
	});

	it('keeps a valid persisted artifact preview session outside the first page', async () => {
		fetchedSessionThreads.push({ id: 'thread-latest', updatedAt: '2026-01-02T00:00:00Z' });
		const olderThread = {
			id: 'thread-older-than-first-page',
			updatedAt: '2025-12-01T00:00:00Z',
			title: 'Older debugging session',
			sessionNumber: 42,
		};
		getSessionThreadDetailMock.mockResolvedValueOnce({ thread: olderThread, executions: [] });
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactPreviewSessionId: 'thread-older-than-first-page',
			},
		});

		await vi.waitFor(() => expect(upsertSessionThreadMock).toHaveBeenCalledWith(olderThread));
		const preview = wrapper.findComponent({ name: 'AgentPreviewDock' });
		expect(preview.props('effectiveSessionId')).toBe('thread-older-than-first-page');
		expect(preview.props('sessionTitle')).toBe('Older debugging session');
		expect(preview.props('hasSession')).toBe(true);
		expect(getSessionThreadDetailMock).toHaveBeenCalledWith(
			'p2',
			'a2',
			'thread-older-than-first-page',
		);

		preview.vm.$emit('send-to-assistant', fixEvent);
		await nextTick();
		expect(wrapper.emitted('assistant-handoff')).toEqual([
			[
				expect.objectContaining({
					initialDraft: expect.stringContaining('"sessionNumber": 42'),
				}),
			],
		]);
	});

	it('does not update the shared session store when validation resolves after unmount', async () => {
		fetchedSessionThreads.push({ id: 'thread-latest', updatedAt: '2026-01-02T00:00:00Z' });
		const detail = Promise.withResolvers<{
			thread: SessionThread;
			executions: [];
		}>();
		getSessionThreadDetailMock.mockReturnValueOnce(detail.promise);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactPreviewSessionId: 'thread-older-than-first-page',
			},
		});
		await vi.waitFor(() =>
			expect(getSessionThreadDetailMock).toHaveBeenCalledWith(
				'p2',
				'a2',
				'thread-older-than-first-page',
			),
		);

		wrapper.unmount();
		detail.resolve({
			thread: {
				id: 'thread-older-than-first-page',
				updatedAt: '2025-12-01T00:00:00Z',
			},
			executions: [],
		});
		await flushPromises();

		expect(upsertSessionThreadMock).not.toHaveBeenCalled();
	});

	it('blocks knowledge file uploads that would exceed the total size limit', async () => {
		getAgentMock.mockResolvedValue(makeAgentResponse({ activeVersionId: 'v1' }));
		listAgentFilesMock.mockResolvedValue([
			{
				id: 'file-1',
				agentId: 'a1',
				fileName: 'existing.txt',
				mimeType: 'text/plain',
				fileSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
				createdAt: '2026-06-01T10:00:00.000Z',
			},
		]);
		const wrapper = await renderView({ knowledgeBaseEnabled: true });

		wrapper
			.findComponent({ name: 'AgentBuilderEditorColumn' })
			.vm.$emit('upload-files', [new File(['x'], 'notes.txt', { type: 'text/plain' })]);
		await flushPromises();

		expect(uploadAgentFilesMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			'agents.builder.files.uploadTotalTooLarge.title',
		);
	});

	it('generates eval cases and confirms the result with a toast', async () => {
		generateDraftCasesMock.mockResolvedValue({
			datasetId: 'd1',
			dataTableId: 'dt1',
			cases: [
				{ input: 'a', whatToCheck: 'x' },
				{ input: 'b', whatToCheck: 'y' },
			],
		});
		const wrapper = await renderView();

		wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).vm.$emit('generate-eval-cases');
		await flushPromises();

		expect(generateDraftCasesMock).toHaveBeenCalledWith(expect.anything(), 'p1', 'a1', {});
		// Nothing renders the generated cases yet, so the toast is the only
		// signal the work landed — without it the click looks like a no-op.
		expect(showMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('surfaces a failed eval-case generation', async () => {
		generateDraftCasesMock.mockRejectedValue(new Error('no model configured'));
		const wrapper = await renderView();

		wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).vm.$emit('generate-eval-cases');
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalled();
		expect(showMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('uploads knowledge files for an unpublished agent', async () => {
		// Default makeAgentResponse() has activeVersionId: null (unpublished).
		const wrapper = await renderView({ knowledgeBaseEnabled: true });

		const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
		wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).vm.$emit('upload-files', [file]);
		await flushPromises();

		expect(uploadAgentFilesMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
			[file],
		);
	});

	it('always includes the Knowledge tab and keeps it selectable regardless of the knowledge base flag', async () => {
		routeQuery.section = 'knowledge';
		const withoutKnowledge = await renderView();
		expect(
			withoutKnowledge.findComponent({ name: 'AgentBuilderEditorColumn' }).props('mainTabOptions'),
		).toContainEqual(expect.objectContaining({ value: 'knowledge' }));
		expect(
			withoutKnowledge.findComponent({ name: 'AgentBuilderEditorColumn' }).props('activeMainTab'),
		).toBe('knowledge');
		expect(
			withoutKnowledge
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.props('knowledgeBaseEnabled'),
		).toBe(false);

		const withKnowledge = await renderView({ knowledgeBaseEnabled: true });
		expect(
			withKnowledge.findComponent({ name: 'AgentBuilderEditorColumn' }).props('mainTabOptions'),
		).toContainEqual(expect.objectContaining({ value: 'knowledge' }));
	});

	it('does not fetch knowledge files when the knowledge base is disabled', async () => {
		routeQuery.section = 'knowledge';
		await renderView();

		expect(listAgentFilesMock).not.toHaveBeenCalled();
	});

	it('warms the knowledge sandbox when the agent page initializes', async () => {
		await renderView({ knowledgeBaseEnabled: true });

		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledTimes(1);
		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
		);
	});

	it('does not warm the knowledge sandbox when agent loading fails', async () => {
		getAgentMock.mockRejectedValueOnce(new Error('load failed'));

		await renderView({ knowledgeBaseEnabled: true });

		expect(warmAgentKnowledgeSandboxMock).not.toHaveBeenCalled();
	});

	it('does not restart session polling when its fetch resolves after unmount', async () => {
		const deferredFetch = Promise.withResolvers<undefined>();
		fetchSessionThreadsMock.mockReturnValueOnce(deferredFetch.promise);
		const wrapper = await renderView();

		expect(fetchSessionThreadsMock).toHaveBeenCalledExactlyOnceWith('p1', 'a1');
		startSessionAutoRefreshMock.mockClear();
		stopSessionAutoRefreshMock.mockClear();

		wrapper.unmount();
		expect(stopSessionAutoRefreshMock).toHaveBeenCalledTimes(1);

		deferredFetch.resolve(undefined);
		await flushPromises();

		expect(startSessionAutoRefreshMock).not.toHaveBeenCalled();
	});

	it('reports an initial session fetch failure and keeps polling for a retry', async () => {
		const fetchError = new Error('session fetch failed');
		fetchSessionThreadsMock.mockRejectedValueOnce(fetchError);

		const wrapper = await renderView();

		expect(showErrorMock).toHaveBeenCalledWith(fetchError, 'agentSessions.showError.load');
		expect(startSessionAutoRefreshMock).toHaveBeenCalledTimes(1);

		wrapper.unmount();
	});

	it('keeps session polling owned by the latest overlapping initialize', async () => {
		const staleAgentFetch = Promise.withResolvers<ReturnType<typeof makeAgentResponse>>();
		getAgentMock.mockReturnValueOnce(staleAgentFetch.promise);
		const wrapper = await renderView({
			waitForAsyncSetup: false,
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a1',
			},
		});
		await flushPromises();
		expect(getAgentMock).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ artifactAgentId: 'a2' });
		await flushPromises();

		expect(stopSessionAutoRefreshMock).toHaveBeenCalledTimes(1);
		expect(fetchSessionThreadsMock).toHaveBeenCalledExactlyOnceWith('p2', 'a2');
		expect(startSessionAutoRefreshMock).toHaveBeenCalledTimes(1);

		staleAgentFetch.resolve(makeAgentResponse());
		await flushPromises();

		expect(stopSessionAutoRefreshMock).toHaveBeenCalledTimes(1);
		expect(fetchSessionThreadsMock).toHaveBeenCalledExactlyOnceWith('p2', 'a2');
		expect(startSessionAutoRefreshMock).toHaveBeenCalledTimes(1);
	});

	it('shows the manual editor for unbuilt agents', async () => {
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValue(makeAgentResponse({ isRunnable: false }));

		const wrapper = await renderView();

		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(false);
	});

	it('opens the preview dock from the header preview action', async () => {
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		header.vm.$emit('open-preview');
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props('isOpen')).toBe(true);
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('opens the preview dock with the latest thread when prior sessions exist', async () => {
		fetchedSessionThreads.push(
			{ id: 'thread-latest', updatedAt: '2026-01-02T00:00:00Z' },
			{ id: 'thread-older', updatedAt: '2026-01-01T00:00:00Z' },
		);

		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		header.vm.$emit('open-preview');
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props()).toEqual(
			expect.objectContaining({ isOpen: true, effectiveSessionId: 'thread-latest' }),
		);
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('opens and starts new artifact Preview sessions without route navigation', async () => {
		const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
		fetchedSessionThreads.push({ id: 'thread-1', updatedAt: '2026-01-01T00:00:00Z' });
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		header.vm.$emit('open-preview');
		await flushPromises();

		const dock = wrapper.findComponent({ name: 'AgentPreviewDock' });
		expect(dock.props('effectiveSessionId')).toBe('thread-1');
		expect(wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).exists()).toBe(true);

		dock.vm.$emit('new-session');
		await flushPromises();

		expect(dock.props('effectiveSessionId')).not.toBe('thread-1');
		expect(routerPush).not.toHaveBeenCalled();
		expect(routerReplace).not.toHaveBeenCalled();
		expect(windowOpen).not.toHaveBeenCalled();
		expect(routeQuery).toEqual({});
	});

	it('navigates to an artifact Preview trace without changing the dock session', async () => {
		fetchedSessionThreads.push({ id: 'thread-1', updatedAt: '2026-01-01T00:00:00Z' });
		const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		wrapper.findComponent({ name: 'AgentBuilderHeader' }).vm.$emit('open-preview');
		await flushPromises();
		const dock = wrapper.findComponent({ name: 'AgentPreviewDock' });
		routerPush.mockClear();

		dock.vm.$emit('view-trace');
		await nextTick();

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: 'AgentSessionDetailView',
			params: {
				projectId: 'p2',
				agentId: 'a2',
				threadId: 'thread-1',
			},
		});
		expect(windowOpen).not.toHaveBeenCalled();
		expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props('effectiveSessionId')).toBe(
			'thread-1',
		);
	});

	it('flushes edits and persists an unsaved artifact before a Preview message', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactAgentPending: true,
			},
		});
		const editor = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
		editor.vm.$emit('update:config', { name: 'Ready to chat' });
		(
			wrapper.vm as unknown as { openArtifactPreview: (sessionId?: string) => void }
		).openArtifactPreview('ephemeral-thread');
		await nextTick();
		const beforeSend = wrapper
			.findComponent({ name: 'AgentPreviewDock' })
			.props('beforeSend') as () => Promise<void>;

		await beforeSend();

		expect(createAgentMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p2',
			'Ready to chat',
			{ id: 'a2' },
		);
		expect(updateConfigMock).toHaveBeenCalledWith(
			'p2',
			'a2',
			expect.objectContaining({ name: 'Ready to chat' }),
		);
	});

	it('shows an error when an unsaved artifact cannot be prepared for Preview', async () => {
		const error = new Error('create failed');
		createAgentMock.mockRejectedValueOnce(error);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactAgentPending: true,
			},
		});
		const { pending } = await startArtifactPreviewSend(wrapper, 'ephemeral-thread');

		await expect(pending).rejects.toBe(error);

		expect(showErrorMock).toHaveBeenCalledWith(error, 'agents.builder.preview.sendError');
	});

	it('keeps the local Preview chat mounted when its persistence event clears pending state', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactAgentPending: true,
			},
		});
		(
			wrapper.vm as unknown as { openArtifactPreview: (sessionId?: string) => void }
		).openArtifactPreview('ephemeral-thread');
		await nextTick();
		const dock = wrapper.findComponent({ name: 'AgentPreviewDock' });
		const dockVm = dock.vm;
		const beforeSend = dock.props('beforeSend') as () => Promise<void>;
		await beforeSend();
		const resetCount = resetSessionStoreMock.mock.calls.length;

		await wrapper.setProps({ artifactAgentPending: false });
		await flushPromises();

		const mountedDock = wrapper.findComponent({ name: 'AgentPreviewDock' });
		expect(mountedDock.vm).toBe(dockVm);
		expect(mountedDock.props('effectiveSessionId')).toBe('ephemeral-thread');
		expect(mountedDock.props('initialized')).toBe(true);
		expect(resetSessionStoreMock).toHaveBeenCalledTimes(resetCount);
	});

	it.each([
		{
			label: 'agent',
			nextProps: { artifactAgentId: 'a3', artifactAgentPending: true },
		},
		{
			label: 'project',
			nextProps: { artifactProjectId: 'p3', artifactAgentPending: true },
		},
	])(
		'closes Preview and clears local session state when the artifact $label target changes',
		async ({ nextProps }) => {
			fetchedSessionThreads.push({
				id: 'previous-agent-thread',
				updatedAt: '2026-01-01T00:00:00Z',
			});
			const wrapper = await renderView({
				props: {
					artifactMode: true,
					artifactProjectId: 'p2',
					artifactAgentId: 'a2',
				},
			});
			wrapper.findComponent({ name: 'AgentBuilderHeader' }).vm.$emit('open-preview');
			await flushPromises();
			expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props('effectiveSessionId')).toBe(
				'previous-agent-thread',
			);

			routerPush.mockClear();
			routerReplace.mockClear();
			await wrapper.setProps(nextProps);
			await flushPromises();

			expect(wrapper.findComponent({ name: 'AgentPreviewDock' }).props('isOpen')).toBe(false);
			expect(wrapper.emitted('preview-open-change')).toEqual([[false], [true], [false]]);
			expect(routerPush).not.toHaveBeenCalled();
			expect(routerReplace).not.toHaveBeenCalled();
			expect(resetSessionStoreMock).toHaveBeenCalled();
			expect(fetchSessionThreadsMock).toHaveBeenCalledTimes(1);
		},
	);

	it('does not reuse or apply a persistence flight after the artifact target changes', async () => {
		const firstCreate = Promise.withResolvers<ReturnType<typeof makeAgentResponse>>();
		const secondCreate = Promise.withResolvers<ReturnType<typeof makeAgentResponse>>();
		createAgentMock
			.mockReturnValueOnce(firstCreate.promise)
			.mockReturnValueOnce(secondCreate.promise);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactAgentPending: true,
			},
		});
		const firstSend = (await startArtifactPreviewSend(wrapper, 'ephemeral-a2')).pending;
		await vi.waitFor(() => expect(createAgentMock).toHaveBeenCalledTimes(1));

		await wrapper.setProps({ artifactAgentId: 'a3' });
		await flushPromises();
		const secondSend = (await startArtifactPreviewSend(wrapper, 'ephemeral-a3')).pending;
		await vi.waitFor(() => expect(createAgentMock).toHaveBeenCalledTimes(2));
		expect(createAgentMock.mock.calls[0]?.[3]).toEqual({ id: 'a2' });
		expect(createAgentMock.mock.calls[1]?.[3]).toEqual({ id: 'a3' });

		firstCreate.resolve(makeAgentResponse({ id: 'a2' }));
		await firstSend;
		expect(wrapper.emitted('persisted')).toBeUndefined();

		secondCreate.resolve(makeAgentResponse({ id: 'a3' }));
		await secondSend;
		expect(wrapper.emitted('persisted')).toEqual([[expect.objectContaining({ id: 'a3' })]]);
	});

	it('reuses an unresolved persistence flight when returning to its artifact target', async () => {
		const firstCreate = Promise.withResolvers<ReturnType<typeof makeAgentResponse>>();
		const secondCreate = Promise.withResolvers<ReturnType<typeof makeAgentResponse>>();
		createAgentMock
			.mockReturnValueOnce(firstCreate.promise)
			.mockReturnValueOnce(secondCreate.promise);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactAgentPending: true,
			},
		});

		const firstSend = (await startArtifactPreviewSend(wrapper, 'ephemeral-a2')).pending;
		await vi.waitFor(() => expect(createAgentMock).toHaveBeenCalledTimes(1));
		await wrapper.setProps({ artifactAgentId: 'a3' });
		await flushPromises();
		const secondSend = (await startArtifactPreviewSend(wrapper, 'ephemeral-a3')).pending;
		await vi.waitFor(() => expect(createAgentMock).toHaveBeenCalledTimes(2));
		await wrapper.setProps({ artifactAgentId: 'a2' });
		await flushPromises();
		const returnedSend = (await startArtifactPreviewSend(wrapper, 'ephemeral-a2-return')).pending;

		expect(createAgentMock).toHaveBeenCalledTimes(2);
		firstCreate.resolve(makeAgentResponse({ id: 'a2' }));
		secondCreate.resolve(makeAgentResponse({ id: 'a3' }));
		await Promise.all([firstSend, secondSend, returnedSend]);
		expect(wrapper.emitted('persisted')).toEqual([[expect.objectContaining({ id: 'a2' })]]);
	});

	it('reuses a successfully created resource when returning to its pending artifact target', async () => {
		const firstCreate = Promise.withResolvers<ReturnType<typeof makeAgentResponse>>();
		createAgentMock.mockReturnValueOnce(firstCreate.promise);
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactAgentPending: true,
			},
		});

		const firstSend = (await startArtifactPreviewSend(wrapper, 'ephemeral-a2')).pending;
		await vi.waitFor(() => expect(createAgentMock).toHaveBeenCalledOnce());
		await wrapper.setProps({ artifactAgentId: 'a3' });
		await flushPromises();
		firstCreate.resolve(makeAgentResponse({ id: 'a2' }));
		await firstSend;
		expect(wrapper.emitted('persisted')).toBeUndefined();

		await wrapper.setProps({ artifactAgentId: 'a2' });
		await flushPromises();
		const returnedSend = await startArtifactPreviewSend(wrapper, 'ephemeral-a2-return');
		await returnedSend.pending;

		expect(createAgentMock).toHaveBeenCalledOnce();
		expect(wrapper.emitted('persisted')).toEqual([[expect.objectContaining({ id: 'a2' })]]);
	});

	it('restarts an in-flight draft initialization when the host reports external persistence', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		const mcpSave = Promise.withResolvers<{
			updatedCount: number;
			updatedIds: string[];
			unchangedIds: string[];
		}>();
		const { useMCPStore } = await import('@/features/ai/mcpAccess/mcp.store');
		const toggleAgentMcpAccess = vi
			.spyOn(useMCPStore(), 'toggleAgentMcpAccess')
			.mockReturnValueOnce(mcpSave.promise);

		// A failed initialize() only shows a toast, then renders the editor with a
		// null agent — which silently drops the toggle below and surfaces three
		// asserts later as an autosave spy with zero calls. Fail here instead,
		// with the swallowed error visible in the spy's recorded calls.
		expect(showErrorMock).not.toHaveBeenCalled();
		const editorColumn = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
		expect(editorColumn.props('agent')).toBeTruthy();

		editorColumn.vm.$emit('toggle-mcp-access', true);
		await nextTick();

		// Switching agents flushes the pending MCP debounce — same path as
		// production, and not dependent on fake timers + nextTick.
		await wrapper.setProps({ artifactAgentId: 'a3', artifactAgentPending: true });
		await flushPromises();
		expect(toggleAgentMcpAccess).toHaveBeenCalledExactlyOnceWith('a2', true);

		await wrapper.setProps({ artifactAgentPending: false });
		mcpSave.resolve({ updatedCount: 1, updatedIds: ['a2'], unchangedIds: [] });
		await flushPromises();

		expect(getAgentMock).toHaveBeenCalledWith({ baseUrl: 'http://localhost:5678' }, 'p2', 'a3');
		expect(wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).props('agentUnsaved')).toBe(
			false,
		);
	});

	it('mints a fresh preview session when landing with no prior threads', async () => {
		routeName = 'AgentPreviewView';

		const wrapper = await renderView();
		await flushPromises();
		const effectiveSessionId = wrapper
			.findComponent({ name: 'AgentPreviewChatPage' })
			.props('effectiveSessionId') as string;

		expect(routerReplace).toHaveBeenCalledWith(
			expect.objectContaining({
				query: expect.objectContaining({ continueSessionId: effectiveSessionId }),
			}),
		);
		expect(effectiveSessionId).toEqual(expect.any(String));
	});

	it('does not open preview when the agent is not runnable', async () => {
		getAgentMock.mockResolvedValue(makeAgentResponse({ isRunnable: false }));

		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		expect(header.props('agent')).toEqual(expect.objectContaining({ isRunnable: false }));

		header.vm.$emit('open-preview');
		await flushPromises();

		expect(routerPush).not.toHaveBeenCalled();
	});

	it('keeps a known continued session selected even when it has no persisted messages', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'faulty-thread';
		fetchedSessionThreads.push({ id: 'faulty-thread', updatedAt: '2026-01-01T00:00:00Z' });

		const wrapper = await renderView();
		routerReplace.mockClear();

		(
			wrapper.vm as unknown as {
				onContinueLoaded: (event: { sessionId: string; count: number }) => void;
			}
		).onContinueLoaded({ sessionId: 'faulty-thread', count: 0 });
		await nextTick();
		await flushPromises();

		expect(routerReplace).not.toHaveBeenCalled();
		expect(
			wrapper.findComponent({ name: 'AgentPreviewChatPage' }).props('effectiveSessionId'),
		).toBe('faulty-thread');
	});

	it('replaces an unknown continued session with a fresh chat when there is no history', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'stale-missing-thread';

		const wrapper = await renderView();
		routerReplace.mockClear();

		(
			wrapper.vm as unknown as {
				onContinueLoaded: (event: { sessionId: string; count: number }) => void;
			}
		).onContinueLoaded({ sessionId: 'stale-missing-thread', count: 0 });
		await flushPromises();

		expect(routerReplace).toHaveBeenCalledWith(
			expect.objectContaining({
				query: expect.objectContaining({ continueSessionId: expect.any(String) }),
			}),
		);
		const replaceQuery = routerReplace.mock.calls[0]?.[0]?.query as {
			continueSessionId: string;
		};
		expect(replaceQuery.continueSessionId).not.toBe('stale-missing-thread');
	});

	it('rebinds an unknown session introduced by an in-place route change', async () => {
		routeName = 'AgentPreviewView';
		fetchedSessionThreads.push({ id: 'thread-latest', updatedAt: '2026-01-01T00:00:00Z' });
		const wrapper = await renderView();
		routerReplace.mockClear();

		routeQuery.continueSessionId = 'stale-route-thread';
		await nextTick();
		expect(
			wrapper.findComponent({ name: 'AgentPreviewChatPage' }).props('effectiveSessionId'),
		).toBe('stale-route-thread');

		(
			wrapper.vm as unknown as {
				onContinueLoaded: (event: { sessionId: string; count: number }) => void;
			}
		).onContinueLoaded({ sessionId: 'stale-route-thread', count: 0 });
		await flushPromises();

		expect(routerReplace).toHaveBeenCalledWith({
			query: expect.objectContaining({ continueSessionId: 'thread-latest' }),
		});
		expect(
			wrapper.findComponent({ name: 'AgentPreviewChatPage' }).props('effectiveSessionId'),
		).toBe('thread-latest');
	});

	it('ignores stale continue-loaded events after New session takes ownership', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'stale-route-thread';
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentPreviewHeader' });
		const preview = wrapper.findComponent({ name: 'AgentPreviewChatPage' });
		routerReplace.mockClear();

		header.vm.$emit('new-session');
		await nextTick();
		const newSessionId = preview.props('effectiveSessionId') as string;
		expect(newSessionId).not.toBe('stale-route-thread');
		expect(routerReplace).toHaveBeenCalledWith({
			query: expect.objectContaining({ continueSessionId: newSessionId }),
		});
		routerReplace.mockClear();

		(
			wrapper.vm as unknown as {
				onContinueLoaded: (event: { sessionId: string; count: number }) => void;
			}
		).onContinueLoaded({ sessionId: 'stale-route-thread', count: 0 });
		await flushPromises();

		expect(routerReplace).not.toHaveBeenCalled();
		expect(preview.props('effectiveSessionId')).toBe(newSessionId);
	});

	it('does not warm the knowledge sandbox again when switching preview sessions', async () => {
		routeName = 'AgentPreviewView';
		getAgentMock.mockResolvedValue(makeAgentResponse({ activeVersionId: 'v1' }));

		const wrapper = await renderView({ knowledgeBaseEnabled: true });

		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledTimes(1);
		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
		);

		wrapper.findComponent({ name: 'AgentPreviewHeader' }).vm.$emit('new-session');
		await nextTick();
		await flushPromises();

		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledTimes(1);
	});

	it('clears stale prompt query params without opening a build chat', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';

		const wrapper = await renderView();

		expect(routerReplace).toHaveBeenCalledWith({
			query: { prompt: undefined, expandBuildChat: undefined },
		});
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
	});

	it('refreshes runnable state from the backend after saving manual config edits', async () => {
		getAgentMock
			.mockResolvedValueOnce(makeAgentResponse({ isRunnable: false }))
			.mockResolvedValueOnce(makeAgentResponse({ isRunnable: true, versionId: 'v2' }));
		updateConfigMock.mockResolvedValueOnce({ versionId: 'v2', stale: false });

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			isBuilt: boolean;
			saveConfig: (snapshot: {
				type: 'config';
				projectId: string;
				agentId: string;
				config: TestAgentConfig;
			}) => Promise<void>;
		};

		expect(vm.isBuilt).toBe(false);

		await vm.saveConfig({
			type: 'config',
			projectId: 'p1',
			agentId: 'a1',
			config: withDefaultLlm({
				name: 'Agent One',
				instructions: 'You are a helpful assistant.',
			})!,
		});
		await nextTick();

		expect(updateConfigMock).toHaveBeenCalled();
		expect(getAgentMock).toHaveBeenLastCalledWith({ baseUrl: 'http://localhost:5678' }, 'p1', 'a1');
		expect(vm.isBuilt).toBe(true);
	});

	it('refreshes full config after channel connection changes the agent', async () => {
		const wrapper = await renderView();
		const channels = wrapper.findComponent({ name: 'AgentChannelsSection' });

		fetchConfigMock.mockClear();
		getAgentMock.mockClear();
		channels.vm.$emit('agent-changed');
		await nextTick();

		expect(getAgentMock).toHaveBeenCalledWith({ baseUrl: 'http://localhost:5678' }, 'p1', 'a1');
		expect(fetchConfigMock).toHaveBeenCalledWith('p1', 'a1');
	});
});

describe('AgentBuilderView — configuration validation', () => {
	beforeEach(() => {
		resetViewMocks();
		vi.restoreAllMocks();
		createObjectURLSpy?.mockRestore();
		revokeObjectURLSpy?.mockRestore();
		anchorClickSpy?.mockRestore();
		createObjectURLSpy = undefined;
		revokeObjectURLSpy = undefined;
		anchorClickSpy = undefined;
		agentPermissionsMock.canCreate.value = true;
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canDelete.value = false;
		agentPermissionsMock.canPublish.value = true;
		agentPermissionsMock.canUnpublish.value = true;
		warmAgentKnowledgeSandboxMock.mockClear();
	});

	it('fetches validation on initial load and forwards the status to the header', async () => {
		getAgentConfigValidationMock.mockResolvedValue({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});

		const wrapper = await renderView();

		expect(getAgentConfigValidationMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
		);
		const header = wrapper.find('[data-testid="stub-agent-builder-header"]');
		expect(header.attributes('data-config-validation-status')).toBe('invalid');
	});

	it('flushes a pending config edit when the builder unmounts', async () => {
		const wrapper = await renderView();
		updateConfigMock.mockClear();
		const vm = wrapper.vm as unknown as {
			onConfigFieldUpdate: (updates: Partial<TestAgentConfig>) => void;
		};

		vm.onConfigFieldUpdate({ name: 'Renamed agent' });
		await nextTick();
		wrapper.unmount();
		await flushPromises();

		expect(updateConfigMock).toHaveBeenCalledWith(
			'p1',
			'a1',
			expect.objectContaining({ name: 'Renamed agent' }),
		);
	});

	it('refreshes validation after a successful config autosave lands', async () => {
		getAgentConfigValidationMock
			.mockResolvedValueOnce({ status: 'invalid', issues: [] })
			.mockResolvedValueOnce({ status: 'valid', issues: [] });

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			configValidation: { status: 'valid' | 'invalid' } | null;
			saveConfig: (snapshot: {
				type: 'config';
				projectId: string;
				agentId: string;
				config: TestAgentConfig;
			}) => Promise<void>;
		};

		expect(vm.configValidation?.status).toBe('invalid');

		await vm.saveConfig({
			type: 'config',
			projectId: 'p1',
			agentId: 'a1',
			config: withDefaultLlm({
				name: 'Agent One',
				instructions: 'You are a helpful assistant.',
			})!,
		});
		await nextTick();

		expect(getAgentConfigValidationMock).toHaveBeenCalledTimes(2);
		expect(vm.configValidation?.status).toBe('valid');
	});

	it('flushes pending edits and revalidates before publishing, aborting when still invalid', async () => {
		getAgentConfigValidationMock
			.mockResolvedValueOnce({ status: 'valid', issues: [] })
			.mockResolvedValueOnce({ status: 'invalid', issues: [] });

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			refreshValidationBeforePublish: () => Promise<boolean>;
		};

		const result = await vm.refreshValidationBeforePublish();

		expect(updateConfigMock).not.toHaveBeenCalled();
		expect(getAgentConfigValidationMock).toHaveBeenCalledTimes(2);
		expect(result).toBe(false);
	});
});

describe('AgentBuilderView — three-column shell', () => {
	beforeEach(() => {
		resetViewMocks();
		favoritesStoreMock.toggleFavorite.mockClear();
		favoritesStoreMock.renameFavorite.mockClear();
		favoritesStoreMock.removeFavoriteLocally.mockClear();
	});

	it('renders only the manual editor without build chat controls', async () => {
		const wrapper = await renderView();

		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(false);
	});

	it('clears stale prompt query params from old deep links', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';

		await renderView();

		expect(routerReplace).toHaveBeenCalledWith({
			query: { prompt: undefined, expandBuildChat: undefined },
		});
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

	it('renders the floating Instance AI button in builder mode', async () => {
		const wrapper = await renderView();
		expect(wrapper.find('[data-testid="agent-builder-instance-ai-btn"]').exists()).toBe(true);
	});

	it('hides the floating Instance AI button in artifact mode', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});

		expect(wrapper.find('[data-testid="agent-builder-instance-ai-btn"]').exists()).toBe(false);
	});

	it('hides the floating Instance AI button when Instance AI is unavailable', async () => {
		instanceAiAvailableRef.value = false;
		const wrapper = await renderView();
		expect(wrapper.find('[data-testid="agent-builder-instance-ai-btn"]').exists()).toBe(false);
	});

	it('opens the agent artifact without sending an opening message', async () => {
		const wrapper = await renderView();
		await wrapper.find('[data-testid="agent-builder-instance-ai-btn"]').trigger('click');
		await flushPromises();

		expect(openAgentArtifactThread).toHaveBeenCalledWith(
			{
				type: 'agent',
				id: 'a1',
				name: 'Agent One',
				projectId: 'p1',
			},
			{
				source: 'agent_builder_page',
				origin: 'internal',
				sourceContext: { agentId: 'a1' },
			},
		);
		expect(startInstanceAiThread).not.toHaveBeenCalled();
	});

	it('renders artifact mode with the editor and without the build chat', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});

		expect(getAgentMock).toHaveBeenCalledWith({ baseUrl: 'http://localhost:5678' }, 'p2', 'a2');
		expect(fetchConfigMock).toHaveBeenCalledWith('p2', 'a2');
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="stub-agent-builder-header"]').attributes()).toMatchObject({
			'data-artifact-mode': 'true',
		});
	});

	it('drops a config edit queued right before the artifact lock engages instead of persisting it', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactEditingLocked: false,
			},
		});
		updateConfigMock.mockClear();

		vi.useFakeTimers();
		try {
			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { name: 'Renamed while building' });

			await wrapper.setProps({ artifactEditingLocked: true });
			await vi.advanceTimersByTimeAsync(500);
		} finally {
			vi.useRealTimers();
		}
		await flushPromises();

		expect(updateConfigMock).not.toHaveBeenCalled();
	});

	it('flushes a pending MCP toggle before switching agents', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p1',
				artifactAgentId: 'a1',
			},
		});
		const { useMCPStore } = await import('@/features/ai/mcpAccess/mcp.store');
		const toggleAgentMcpAccess = vi.spyOn(useMCPStore(), 'toggleAgentMcpAccess').mockResolvedValue({
			updatedCount: 1,
			updatedIds: ['a1'],
			unchangedIds: [],
		});

		// See the sibling MCP test above: a failed initialize() drops the toggle
		// silently, so guard the mount before emitting.
		expect(showErrorMock).not.toHaveBeenCalled();
		const editorColumn = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
		expect(editorColumn.props('agent')).toBeTruthy();

		vi.useFakeTimers();
		try {
			editorColumn.vm.$emit('toggle-mcp-access', true);
			await nextTick();

			await wrapper.setProps({ artifactAgentId: 'a2' });
			await flushPromises();

			expect(toggleAgentMcpAccess).toHaveBeenCalledExactlyOnceWith('a1', true);
		} finally {
			vi.useRealTimers();
			wrapper.unmount();
		}
	});

	it('resets the autosave save status when the artifact agent target changes', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		vi.useFakeTimers();
		try {
			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { name: 'Agent A edit' });
			await nextTick();
			// Let the debounced config autosave fire and resolve — status lands on
			// 'saved' for A with a `saved → idle` hold timer queued.
			await vi.advanceTimersByTimeAsync(500);
			await flushPromises();
			expect(header.props('saveStatus')).toBe('saved');

			// Genuine A→B switch: initialize() drains A's autosave loop, then
			// reset() clears the inherited 'saved' indicator before B can show it.
			await wrapper.setProps({ artifactAgentId: 'a3' });
			await flushPromises();

			expect(header.props('saveStatus')).toBe('idle');

			// The `saved → idle` hold timer A queued must not fire for B.
			await vi.advanceTimersByTimeAsync(5000);
			expect(header.props('saveStatus')).toBe('idle');
		} finally {
			vi.useRealTimers();
			wrapper.unmount();
		}
	});

	it('resets autosave save status on target change even when the previous agent drain fails', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });
		const { useMCPStore } = await import('@/features/ai/mcpAccess/mcp.store');
		vi.spyOn(useMCPStore(), 'toggleAgentMcpAccess').mockRejectedValue(new Error('mcp save failed'));

		vi.useFakeTimers();
		try {
			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { name: 'Agent A edit' });
			await nextTick();
			await vi.advanceTimersByTimeAsync(500);
			await flushPromises();
			expect(header.props('saveStatus')).toBe('saved');

			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('toggle-mcp-access', true);
			await nextTick();

			await wrapper.setProps({ artifactAgentId: 'a3' });
			await flushPromises();

			expect(header.props('saveStatus')).toBe('idle');
			await expect(
				(wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave(),
			).resolves.toBeUndefined();
		} finally {
			vi.useRealTimers();
			wrapper.unmount();
		}
	});

	it('retains the autosave save status when a pending artifact persists under the same id', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p1',
				artifactAgentId: 'aBcDeFgHiJkLmNoP',
				artifactAgentPending: true,
			},
		});
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		vi.useFakeTimers();
		try {
			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { instructions: 'first edit' });
			await nextTick();
			await vi.advanceTimersByTimeAsync(500);
			await flushPromises();
			expect(header.props('saveStatus')).toBe('saved');

			// Same-id pending → persisted hydrates without unmounting and must not
			// reset the autosave loop's status.
			await wrapper.setProps({ artifactAgentPending: false });
			await flushPromises();

			expect(header.props('saveStatus')).toBe('saved');
		} finally {
			vi.useRealTimers();
			wrapper.unmount();
		}
	});

	it('still resets autosave state when a pending-target hydration supersedes the switch mid-drain', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		vi.useFakeTimers();
		try {
			// A's save hangs so the A→B switch's drain stays in flight.
			let rejectSave: (error: Error) => void = () => {};
			updateConfigMock.mockImplementationOnce(
				async () =>
					await new Promise((_resolve, reject) => {
						rejectSave = reject;
					}),
			);
			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { name: 'Agent A edit' });
			await nextTick();
			await vi.advanceTimersByTimeAsync(500);

			// Genuine switch to a pending B: the switching init starts draining
			// A's hanging save and cannot reach its reset yet.
			await wrapper.setProps({ artifactAgentId: 'a3', artifactAgentPending: true });
			// B persists while that drain is still in flight: the same-target
			// hydration supersedes the switching init and must take over the
			// owed reset.
			await wrapper.setProps({ artifactAgentPending: false });

			// A's save eventually fails; it belongs to A and must stay detached.
			rejectSave(new Error('save for A failed'));
			await flushPromises();

			expect(header.props('saveStatus')).toBe('idle');
			// B's flush must not rethrow A's error.
			await expect(
				(wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave(),
			).resolves.toBeUndefined();
		} finally {
			vi.useRealTimers();
			wrapper.unmount();
		}
	});

	it('keeps artifact mode tab switching out of the route query', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});
		routerReplace.mockClear();

		wrapper
			.findComponent({ name: 'AgentBuilderEditorColumn' })
			.vm.$emit('update:activeMainTab', 'settings');
		await nextTick();

		expect(routerReplace).not.toHaveBeenCalled();
		expect(wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).props('activeMainTab')).toBe(
			'settings',
		);
	});

	it('passes artifact ids and new-tab navigation into the embedded sessions list', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
			},
		});

		wrapper
			.findComponent({ name: 'AgentBuilderEditorColumn' })
			.vm.$emit('update:activeMainTab', 'sessions');
		await nextTick();

		const sessions = wrapper.findComponent({ name: 'AgentSessionsListView' });
		expect(sessions.props()).toMatchObject({
			embedded: true,
			projectId: 'p2',
			agentId: 'a2',
			manageStoreLifecycle: false,
		});
	});

	it('refreshes the shell when another surface reports an update to this agent', async () => {
		// Unique ids: earlier tests leave mounted instances (and their bus
		// listeners) behind, so shared ids would inflate the mock call counts.
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p-bus',
				artifactAgentId: 'a-bus',
			},
		});
		getAgentMock.mockClear();
		fetchConfigMock.mockClear();

		vi.useFakeTimers();
		try {
			agentsEventBus.emit('agentUpdated', { agentId: 'a-bus', source: 'channel-setup-card' });
			await vi.advanceTimersByTimeAsync(400);
		} finally {
			vi.useRealTimers();
		}
		await flushPromises();

		expect(getAgentMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p-bus',
			'a-bus',
		);
		expect(fetchConfigMock).toHaveBeenCalledWith('p-bus', 'a-bus');

		// Other agents' updates and the builder's own writes are ignored.
		getAgentMock.mockClear();
		fetchConfigMock.mockClear();
		vi.useFakeTimers();
		try {
			agentsEventBus.emit('agentUpdated', { agentId: 'a-other', source: 'channel-setup-card' });
			agentsEventBus.emit('agentUpdated', { agentId: 'a-bus', source: 'agent-builder' });
			await vi.advanceTimersByTimeAsync(400);
		} finally {
			vi.useRealTimers();
		}
		await flushPromises();

		expect(getAgentMock).not.toHaveBeenCalled();
		expect(fetchConfigMock).not.toHaveBeenCalled();

		wrapper.unmount();
	});

	it('coalesces rapid external agent updates into one refresh cascade', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p-debounce',
				artifactAgentId: 'a-debounce',
			},
		});
		getAgentMock.mockClear();
		fetchConfigMock.mockClear();

		vi.useFakeTimers();
		try {
			agentsEventBus.emit('agentUpdated', { agentId: 'a-debounce', source: 'channel-setup-card' });
			agentsEventBus.emit('agentUpdated', { agentId: 'a-debounce', source: 'instance-ai' });
			await vi.advanceTimersByTimeAsync(400);
		} finally {
			vi.useRealTimers();
		}
		await flushPromises();

		expect(getAgentMock).toHaveBeenCalledTimes(1);
		expect(fetchConfigMock).toHaveBeenCalledTimes(1);

		wrapper.unmount();
	});

	it('replays external agent updates that arrive before initialization completes', async () => {
		let resolveAgent!: (agent: ReturnType<typeof makeAgentResponse>) => void;
		getAgentMock.mockReturnValueOnce(new Promise((resolve) => (resolveAgent = resolve)));

		// Unique ids so stale mounted instances from earlier tests ignore the emit.
		const wrapper = await renderView({
			waitForAsyncSetup: false,
			props: {
				artifactMode: true,
				artifactProjectId: 'p-bus-init',
				artifactAgentId: 'a-bus-init',
			},
		});
		await vi.waitFor(() => {
			expect(getAgentMock).toHaveBeenCalledTimes(1);
			expect(fetchConfigMock).toHaveBeenCalledTimes(1);
		});

		agentsEventBus.emit('agentUpdated', { agentId: 'a-bus-init', source: 'channel-setup-card' });
		await nextTick();
		expect(getAgentMock).toHaveBeenCalledTimes(1);
		expect(fetchConfigMock).toHaveBeenCalledTimes(1);

		resolveAgent(makeAgentResponse());
		await flushPromises();
		await flushPromises();

		expect(getAgentMock).toHaveBeenCalledTimes(2);
		expect(fetchConfigMock).toHaveBeenCalledTimes(2);
		expect(getAgentMock).toHaveBeenLastCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p-bus-init',
			'a-bus-init',
		);
		expect(fetchConfigMock).toHaveBeenLastCalledWith('p-bus-init', 'a-bus-init');

		wrapper.unmount();
	});

	it('surfaces errors from a replayed external agent update', async () => {
		let resolveAgent!: (agent: ReturnType<typeof makeAgentResponse>) => void;
		getAgentMock.mockReturnValueOnce(new Promise((resolve) => (resolveAgent = resolve)));
		fetchConfigMock.mockImplementationOnce(async () => {
			mockConfig.value = withDefaultLlm(intendedConfig);
		});
		const replayError = new Error('refresh failed');
		fetchConfigMock.mockRejectedValueOnce(replayError);

		const wrapper = await renderView({
			waitForAsyncSetup: false,
			props: {
				artifactMode: true,
				artifactProjectId: 'p-err',
				artifactAgentId: 'a-err',
			},
		});
		await vi.waitFor(() => {
			expect(fetchConfigMock).toHaveBeenCalledTimes(1);
		});

		// Lands mid-initialize → queued via pendingExternalRefresh, replayed after init.
		agentsEventBus.emit('agentUpdated', { agentId: 'a-err', source: 'channel-setup-card' });

		resolveAgent(makeAgentResponse());
		await flushPromises();
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalledWith(replayError, 'agents.builder.loadError');
		wrapper.unmount();
	});

	it('adds JSON import and export actions to the header menu', async () => {
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		expect(header.props('headerActions')).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'export-json', label: 'agents.builder.exportJson' }),
				expect.objectContaining({ id: 'import-json', label: 'agents.builder.importJson' }),
			]),
		);
	});

	it('toggles the favorite from the header menu', async () => {
		const wrapper = await renderView();

		wrapper
			.findComponent({ name: 'AgentBuilderHeader' })
			.vm.$emit('header-action', 'toggleFavorite');
		await flushPromises();

		expect(favoritesStoreMock.toggleFavorite).toHaveBeenCalledWith('a1', 'agent');
	});

	describe('unsaved (pending) artifact', () => {
		const pendingProps = {
			artifactMode: true,
			artifactProjectId: 'p1',
			artifactAgentId: 'aBcDeFgHiJkLmNoP',
			artifactAgentPending: true,
		};

		it('renders without reading anything for an agent that does not exist yet', async () => {
			await renderView({ props: pendingProps });

			expect(getAgentMock).not.toHaveBeenCalled();
			expect(fetchConfigMock).not.toHaveBeenCalled();
			expect(createAgentMock).not.toHaveBeenCalled();
		});

		it('creates the pending agent once and refreshes validation after the first save', async () => {
			let configTarget: string | undefined;
			repointConfigMock.mockImplementation((projectId: string, agentId: string) => {
				configTarget = `${projectId}:${agentId}`;
			});
			updateConfigMock.mockImplementation(async (projectId: string, agentId: string) => ({
				versionId: 'v1',
				stale: configTarget !== `${projectId}:${agentId}`,
			}));
			const wrapper = await renderView({ props: pendingProps });
			const editor = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });

			editor.vm.$emit('update:config', {
				name: 'Support Agent',
				instructions: 'Answer support mail',
			});
			editor.vm.$emit('update:config', { model: 'anthropic/claude-sonnet-4-5' });
			await vi.waitFor(() => expect(updateConfigMock).toHaveBeenCalled());

			expect(createAgentMock).toHaveBeenCalledTimes(1);
			expect(createAgentMock).toHaveBeenCalledWith(expect.anything(), 'p1', expect.any(String), {
				id: 'aBcDeFgHiJkLmNoP',
			});
			expect(updateConfigMock).toHaveBeenCalledWith(
				'p1',
				'aBcDeFgHiJkLmNoP',
				expect.objectContaining({ instructions: 'Answer support mail' }),
			);
			await vi.waitFor(() =>
				expect(
					wrapper
						.find('[data-testid="stub-agent-builder-header"]')
						.attributes('data-config-validation-status'),
				).toBe('valid'),
			);
			expect(wrapper.emitted('name-saved')).toContainEqual(['Support Agent']);
		});

		it('persists the icon and gradient with the first save, so a new agent keeps them', async () => {
			const wrapper = await renderView({ props: pendingProps });

			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { instructions: 'Answer support mail' });
			await vi.waitFor(() => expect(updateConfigMock).toHaveBeenCalled());

			expect(updateConfigMock).toHaveBeenCalledWith(
				'p1',
				'aBcDeFgHiJkLmNoP',
				expect.objectContaining({
					personalisation: expect.objectContaining({
						icon: expect.any(String),
						gradient: expect.objectContaining({ angle: expect.any(Number) }),
					}),
				}),
			);
		});

		it('reports the agent so the host can stop treating the artifact as pending', async () => {
			const wrapper = await renderView({ props: pendingProps });

			wrapper
				.findComponent({ name: 'AgentBuilderEditorColumn' })
				.vm.$emit('update:config', { instructions: 'Answer support mail' });
			await vi.waitFor(() => expect(updateConfigMock).toHaveBeenCalled());

			expect(wrapper.emitted('persisted')).toHaveLength(1);
		});

		it('keeps the editor mounted while a newly persisted artifact hydrates', async () => {
			const wrapper = await renderView({ props: pendingProps });
			const editor = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
			const ensureAgentPersisted = editor.props('ensureAgentPersisted') as () => Promise<void>;

			await ensureAgentPersisted();

			let finishHydrating = () => {};
			getAgentMock.mockReturnValueOnce(
				new Promise((resolve) => {
					finishHydrating = () => resolve(makeAgentResponse());
				}),
			);

			await wrapper.setProps({ artifactAgentPending: false });
			await nextTick();

			expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(false);
			expect(wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).exists()).toBe(true);

			finishHydrating();
			await flushPromises();
		});

		it('flushes a pending config edit before same-agent artifact hydration', async () => {
			const wrapper = await renderView({ props: pendingProps });
			const editor = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
			const ensureAgentPersisted = editor.props('ensureAgentPersisted') as () => Promise<void>;

			vi.useFakeTimers();
			try {
				editor.vm.$emit('update:config', { instructions: 'Keep these instructions' });
				await nextTick();

				await ensureAgentPersisted();

				let resolveUpdate!: (value: { versionId: string; stale: boolean }) => void;
				updateConfigMock.mockReset();
				updateConfigMock.mockImplementation(
					() =>
						new Promise((resolve) => {
							resolveUpdate = resolve;
						}),
				);
				intendedConfig = {
					name: 'agents.new.defaultName',
					instructions: 'Keep these instructions',
				};
				fetchConfigMock.mockClear();

				await wrapper.setProps({ artifactAgentPending: false });
				await flushPromises();

				expect(updateConfigMock).toHaveBeenCalledWith(
					'p1',
					'aBcDeFgHiJkLmNoP',
					expect.objectContaining({ instructions: 'Keep these instructions' }),
				);
				expect(fetchConfigMock).not.toHaveBeenCalled();

				resolveUpdate({ versionId: 'v2', stale: false });
				await flushPromises();

				expect(fetchConfigMock).toHaveBeenCalledWith('p1', 'aBcDeFgHiJkLmNoP');
				expect(
					wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).props('localConfig'),
				).toEqual(expect.objectContaining({ instructions: 'Keep these instructions' }));

				updateConfigMock.mockClear();
				await vi.advanceTimersByTimeAsync(500);
				await flushPromises();
				expect(updateConfigMock).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
				wrapper.unmount();
			}
		});

		it('keeps a channel added while the persisted artifact trigger baseline finishes', async () => {
			let finishBaseline = () => {};
			const pendingBaseline = new Promise<string[]>((resolve) => {
				finishBaseline = () => resolve([]);
			});
			builderTelemetryMock.fetchInitialTriggersBaseline
				.mockResolvedValueOnce([])
				.mockReturnValueOnce(pendingBaseline);
			const wrapper = await renderView({ props: pendingProps });
			const editor = wrapper.findComponent({ name: 'AgentBuilderEditorColumn' });
			const ensureAgentPersisted = editor.props('ensureAgentPersisted') as () => Promise<void>;

			await ensureAgentPersisted();
			await wrapper.setProps({ artifactAgentPending: false });
			await vi.waitFor(() =>
				expect(builderTelemetryMock.fetchInitialTriggersBaseline).toHaveBeenCalledTimes(2),
			);

			editor.vm.$emit('update:connected-triggers', ['slack']);
			await nextTick();
			finishBaseline();
			await flushPromises();

			expect(editor.props('connectedTriggers')).toEqual(['slack']);
		});
	});

	it('updates the favorite name in the sidebar when the agent is renamed', async () => {
		const wrapper = await renderView();

		wrapper
			.findComponent({ name: 'AgentBuilderEditorColumn' })
			.vm.$emit('update:config', { name: 'Renamed Agent' });

		expect(favoritesStoreMock.renameFavorite).toHaveBeenCalledWith('a1', 'agent', 'Renamed Agent');
	});

	it('exports the current agent config as a JSON file from the header menu', async () => {
		Object.defineProperty(URL, 'createObjectURL', {
			configurable: true,
			value: vi.fn(),
		});
		Object.defineProperty(URL, 'revokeObjectURL', {
			configurable: true,
			value: vi.fn(),
		});
		createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:agent-json');
		revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		const createdAnchors: HTMLAnchorElement[] = [];
		const originalCreateElement = document.createElement.bind(document);
		const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
			const element = originalCreateElement(tagName);
			if (tagName === 'a') {
				createdAnchors.push(element as HTMLAnchorElement);
			}
			return element;
		});

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentBuilderHeader' }).vm.$emit('header-action', 'export-json');
		await flushPromises();

		expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
		const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
		await expect(readBlobText(blob)).resolves.toBe(
			`${JSON.stringify(withDefaultLlm(intendedConfig), null, 2)}\n`,
		);
		expect(createdAnchors[0]?.download).toBe('Agent One.json');
		expect(anchorClickSpy).toHaveBeenCalled();
		expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:agent-json');

		createElementSpy.mockRestore();
	});

	it('opens the JSON import modal and saves imported config from the header menu', async () => {
		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentBuilderHeader' }).vm.$emit('header-action', 'import-json');
		await nextTick();

		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'agentJsonImportModal',
				data: expect.objectContaining({
					onConfirm: expect.any(Function),
				}),
			}),
		);

		const importedConfig = {
			name: 'Imported agent',
			model: 'openai/gpt-4o-mini',
			credential: 'cred-openai',
			instructions: 'Use the imported settings.',
		};
		openModalWithDataMock.mock.calls[0][0].data.onConfirm(importedConfig);
		await nextTick();

		expect((wrapper.vm as unknown as { localConfig: unknown }).localConfig).toMatchObject(
			importedConfig,
		);
		expect((wrapper.vm as unknown as { agent: { name: string } }).agent.name).toBe(
			'Imported agent',
		);
		expect(favoritesStoreMock.renameFavorite).toHaveBeenLastCalledWith(
			'a1',
			'agent',
			'Imported agent',
		);

		await (wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave();

		expect(updateConfigMock).toHaveBeenCalledWith(
			'p1',
			'a1',
			expect.objectContaining({
				...importedConfig,
				memory: { enabled: true, storage: 'n8n' },
			}),
		);
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
		const validationIssue = {
			code: 'missing_reference' as const,
			path: 'tools.0.id',
			capability: {
				kind: 'tool' as const,
				id: 'custom_tool',
				index: 0,
				toolType: 'custom' as const,
			},
		};
		getAgentConfigValidationMock.mockResolvedValue({
			status: 'invalid',
			issues: [validationIssue],
		});
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
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				tools: {
					custom_tool: customTool,
				},
			}),
		);

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).vm.$emit('open-tool', {
			kind: 'tool',
			toolType: 'custom',
			id: 'custom_tool',
		});
		await nextTick();

		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'agentToolConfigModal',
				data: expect.objectContaining({
					toolRef,
					customTool,
					validationIssues: [validationIssue],
				}),
			}),
		);
	});

	it('applies the tools modal confirm payload as arrays to the local config', async () => {
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = withDefaultLlm(intendedConfig);

		const wrapper = await renderView();
		wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).vm.$emit('add-tool');
		await nextTick();

		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'agentToolsModal',
				data: expect.objectContaining({
					projectId: 'p1',
					agentId: 'a1',
				}),
			}),
		);

		// The modal confirms with a single object payload — a positional handler
		// would land the whole object in `config.tools` and fail backend validation.
		const modalData = openModalWithDataMock.mock.calls[0][0].data as {
			onConfirm: (payload: { tools?: AgentJsonToolRef[]; mcpServers?: unknown[] }) => void;
		};
		const tools: AgentJsonToolRef[] = [{ type: 'custom', id: 'custom_tool' }];
		modalData.onConfirm({ tools, mcpServers: [] });
		await nextTick();

		const vm = wrapper.vm as unknown as {
			localConfig: { tools?: AgentJsonToolRef[]; mcpServers?: unknown[] };
		};
		expect(Array.isArray(vm.localConfig.tools)).toBe(true);
		expect(vm.localConfig.tools).toEqual(tools);
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
		mockConfig.value = withDefaultLlm(intendedConfig);
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
		mockConfig.value = withDefaultLlm(intendedConfig);
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
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValueOnce(makeAgentResponse({ skills: {} }));
		createAgentSkillMock.mockResolvedValueOnce({
			id: 'skill_0Ab9ZkLm3Pq7Xy2N',
			skill,
			versionId: 'v2',
		});
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				skills: { skill_0Ab9ZkLm3Pq7Xy2N: skill },
			}),
		);

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
			allowedTools: ['load_workflow'],
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
				},
			],
		};
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			tools: [{ type: 'workflow', workflow: 'load_workflow' }],
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		};
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				skills: {
					summarize_notes: skill,
				},
			}),
		);
		updateAgentSkillMock.mockResolvedValueOnce({
			id: 'summarize_notes',
			skill: updatedSkill,
			versionId: 'v2',
		});

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

		expect(
			(wrapper.vm as unknown as { agent: { skills: Record<string, unknown> } }).agent.skills,
		).toEqual({
			summarize_notes: updatedSkill,
		});
		expect(wrapper.findComponent({ name: 'AgentCapabilitiesSection' }).props('skills')).toEqual([
			{ id: 'summarize_notes', skill: updatedSkill },
		]);

		await (wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave();
		await nextTick();

		expect(updateAgentSkillMock).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'a1',
			'summarize_notes',
			updatedSkill,
		);
	});

	it('omits allowed tools before saving a skill when none are attached', async () => {
		const skill = {
			name: 'summarize_notes',
			description: 'Use when summarizing notes',
			instructions: 'Read the notes and produce a concise summary.',
			allowedTools: ['missing_tool'],
		};
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
			skills: [{ type: 'skill', id: 'summarize_notes' }],
		};
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValueOnce(
			makeAgentResponse({
				skills: {
					summarize_notes: skill,
				},
			}),
		);
		updateAgentSkillMock.mockResolvedValueOnce({
			id: 'summarize_notes',
			skill: {
				name: skill.name,
				description: skill.description,
				instructions: skill.instructions,
			},
			versionId: 'v2',
		});

		const wrapper = await renderView();
		wrapper
			.findComponent({ name: 'AgentCapabilitiesSection' })
			.vm.$emit('open-skill', 'summarize_notes');
		await nextTick();
		openModalWithDataMock.mock.calls[0][0].data.onConfirm({ id: 'summarize_notes', skill });
		await (wrapper.vm as unknown as { flushAutosave: () => Promise<void> }).flushAutosave();

		expect(updateAgentSkillMock).toHaveBeenCalledWith(
			expect.anything(),
			'p1',
			'a1',
			'summarize_notes',
			{
				name: skill.name,
				description: skill.description,
				instructions: skill.instructions,
			},
		);
	});

	it('shows the loading spinner while initialize() is in flight and hides it after', async () => {
		// A promise that we control — lets us capture the intermediate loading state.
		let resolveAgent!: (v: unknown) => void;
		getAgentMock.mockReturnValueOnce(new Promise((r) => (resolveAgent = r)));

		const wrapper = await renderView({ waitForAsyncSetup: false });

		// initialize() hasn't resolved yet → spinner visible, content hidden.
		await nextTick();
		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);

		// Let initialize() complete.
		resolveAgent(makeAgentResponse());
		await flushPromises();

		// Spinner gone, content rendered.
		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
	});

	it('clears the loading spinner and shows an error when initialize() throws (finally path)', async () => {
		getAgentMock.mockRejectedValueOnce(new Error('network error'));

		const wrapper = await renderView({ waitForAsyncSetup: false });

		await flushPromises();

		// initialized is set in the `finally` block, so the spinner must be gone.
		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(false);
		// The catch block must have surfaced the error to the user.
		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});
});

// Generous timeout for the same reason as the preview-routing block: mounting
// this SFC plus its design-system deps is slow enough under parallel-suite
// pressure to trip default timeouts.
describe('AgentBuilderView — evals focus request', { timeout: 60_000 }, () => {
	beforeEach(() => {
		resetViewMocks();
		agentEvalsFlagMock.enabled = true;
	});

	async function seedFocusRequest(
		agentId: string,
		generate: boolean,
		props?: Record<string, unknown>,
	) {
		const { useAgentEvalsStore } = await import('../agentEvals.store');
		return await renderView({
			props,
			seedStores: () => {
				useAgentEvalsStore().requestEvalsFocus(agentId, generate);
			},
		});
	}

	/**
	 * Settle by pumping ticks rather than wall-clock polling: earlier blocks in
	 * this file install fake timers, under which `vi.waitFor` stalls.
	 *
	 * Condition-based rather than a fixed tick budget because the watcher holds
	 * the request until `initialize()` resolves, and how many ticks that takes
	 * varies with how the mocked fetches interleave. Stops early once `settled`
	 * holds; on a negative assertion it runs the full budget, which is what makes
	 * "still not shown" mean quiesced rather than merely not-yet-processed.
	 */
	async function settle(settled: () => boolean) {
		// Budget is generous because pumping microtasks is cheap and this file's
		// mocked fetch chains settle over a variable number of ticks under load.
		for (let i = 0; i < 200; i++) {
			if (settled()) return;
			await flushPromises();
			await nextTick();
		}
	}

	function evalsTabShown(wrapper: Awaited<ReturnType<typeof renderView>>) {
		return () => wrapper.find('[data-testid="agent-evals-tab-content"]').exists();
	}

	it('selects the evals tab for a request raised before it mounted', async () => {
		const wrapper = await seedFocusRequest('a1', false);
		await settle(evalsTabShown(wrapper));

		expect(evalsTabShown(wrapper)()).toBe(true);
		expect(generateDraftCasesMock).not.toHaveBeenCalled();
	});

	it('starts generation when the request asks for it', async () => {
		await seedFocusRequest('a1', true);
		await settle(() => generateDraftCasesMock.mock.calls.length > 0);

		expect(generateDraftCasesMock).toHaveBeenCalledOnce();
	});

	it('ignores a request naming a different agent', async () => {
		const wrapper = await seedFocusRequest('some-other-agent', true);
		await settle(evalsTabShown(wrapper));

		expect(evalsTabShown(wrapper)()).toBe(false);
		expect(generateDraftCasesMock).not.toHaveBeenCalled();
	});

	it('ignores the request while the evals tab is absent from the row', async () => {
		agentEvalsFlagMock.enabled = false;

		const wrapper = await seedFocusRequest('a1', true);
		await settle(evalsTabShown(wrapper));

		expect(evalsTabShown(wrapper)()).toBe(false);
		expect(generateDraftCasesMock).not.toHaveBeenCalled();
	});

	it('ignores the request while the agent is still unsaved', async () => {
		// Unsaved narrows the row to Agent only, so honouring the request here
		// would render evals content with no Evals tab visible to match it.
		const wrapper = await seedFocusRequest('aBcDeFgHiJkLmNoP', true, {
			artifactMode: true,
			artifactProjectId: 'p1',
			artifactAgentId: 'aBcDeFgHiJkLmNoP',
			artifactAgentPending: true,
		});
		await settle(evalsTabShown(wrapper));

		expect(evalsTabShown(wrapper)()).toBe(false);
		expect(generateDraftCasesMock).not.toHaveBeenCalled();
	});

	// Not covered here: a request raised *after* this view mounted. It is the same
	// watcher on a different trigger, and a view-level test for it proved
	// irreducibly flaky in CI — this file's mounted views leave async work in
	// flight, so whether the request is served or still legitimately held within a
	// bounded settle is not deterministic. The store tests pin the hold/consume
	// semantics instead; see `agentEvals.store.test.ts`.
});
