/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep and private-state reads */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES } from '@n8n/api-types';
import type {
	AgentJsonConfig,
	AgentJsonSkillRef,
	AgentJsonToolRef,
	CustomToolEntry,
} from '../types';
import { getRandomAgentPersonalisationGradient } from '../utils/agentPersonalisation';

const routerPush = vi.fn();
const routerReplace = vi.fn();
const routeQuery: Record<string, string | undefined> = {};
let routeName = 'AgentBuilderView';
const openModalWithDataMock = vi.fn();
const closeModalMock = vi.fn();
const showMessageMock = vi.fn();
const showErrorMock = vi.fn();
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
		resolve: (to: { name?: string; params?: Record<string, string> }) => ({
			href: `/${to.name ?? ''}/${Object.values(to.params ?? {}).join('/')}`,
		}),
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

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
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
const updateConfigMock = vi.fn();
const fetchConfigMock = vi.fn();
const listAgentFilesMock = vi.fn().mockResolvedValue([]);
const uploadAgentFilesMock = vi.fn().mockResolvedValue([]);
const warmAgentKnowledgeSandboxMock = vi.fn().mockResolvedValue({ accepted: true });
const sessionThreads: Array<{ id: string; updatedAt: string }> = [];

vi.mock('../composables/useAgentApi', () => ({
	getAgent: getAgentMock,
	updateAgent: updateAgentMock,
	updateAgentSkill: updateAgentSkillMock,
	createAgentSkill: createAgentSkillMock,
	deleteAgent: vi.fn(),
	publishAgent: publishAgentMock,
	getIntegrationStatus: getIntegrationStatusMock,
	getModelCatalog: vi.fn().mockResolvedValue({}),
	listAgentFiles: listAgentFilesMock,
	uploadAgentFiles: uploadAgentFilesMock,
	deleteAgentFile: vi.fn(),
	warmAgentKnowledgeSandbox: warmAgentKnowledgeSandboxMock,
}));

vi.mock('../composables/useAgentBuilderTelemetry', () => ({
	useAgentBuilderTelemetry: () => ({
		resetForAgentSwitch: vi.fn(),
		captureToolsBaseline: vi.fn(),
		captureSkillsBaseline: vi.fn(),
		captureTasksBaseline: vi.fn(),
		fetchInitialTriggersBaseline: vi.fn().mockResolvedValue(null),
		recordConfigEdit: vi.fn(),
		flushConfigEdits: vi.fn(),
		trackToolsAdded: vi.fn(),
		trackSkillsAdded: vi.fn(),
		trackTasksChanged: vi.fn(),
		trackOpenedToolFromList: vi.fn(),
		trackOpenedSkillFromList: vi.fn(),
		trackOpenedAddSkillModal: vi.fn(),
	}),
}));

vi.mock('../composables/useAgentBuilderStatus', () => ({
	useAgentBuilderStatus: () => ({
		isBuilderConfigured: ref(true),
		fetchStatus: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => agentPermissionsMock,
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
		'agents.builder.chat.hide.ariaLabel': 'Hide builder',
		'agents.builder.chat.show.ariaLabel': 'Show builder',
		'agents.builder.preview.button': 'Preview',
		'agents.builder.preview.close.ariaLabel': 'Close preview',
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
async function renderView({
	knowledgeBaseEnabled = false,
	waitForAsyncSetup = true,
	props,
}: {
	knowledgeBaseEnabled?: boolean;
	waitForAsyncSetup?: boolean;
	props?: Record<string, unknown>;
} = {}) {
	const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
	const pinia = createPinia();
	setActivePinia(pinia);
	const { useSettingsStore } = await import('@/app/stores/settings.store');
	const settingsStore = useSettingsStore();
	settingsStore.settings = { activeModules: knowledgeBaseEnabled ? ['agents'] : [] } as never;
	settingsStore.moduleSettings = {
		agents: {
			modules: [],
			knowledgeBaseEnabled,
		},
	};
	const wrapper = mount(AgentBuilderView, {
		props,
		global: {
			plugins: [pinia],
			stubs: commonStubs,
		},
	});
	if (waitForAsyncSetup) await flushPromises();
	return wrapper;
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
			'continueSessionId',
		],
	},
	AgentPreviewChatPage: {
		name: 'AgentPreviewChatPage',
		template: '<div data-testid="stub-agent-preview-chat-page" />',
		props: [
			'initialized',
			'projectId',
			'agentId',
			'agent',
			'localConfig',
			'connectedTriggers',
			'effectiveSessionId',
			'initialPrompt',
		],
		emits: ['config-updated', 'continue-loaded', 'open-build'],
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
		props: [
			'tools',
			'mcpServers',
			'projectId',
			'agentId',
			'connectedTriggers',
			'isPublished',
			'disabled',
		],
		emits: ['update:tools', 'update:connected-triggers', 'trigger-added'],
	},
	AgentBuilderHeader: {
		name: 'AgentBuilderHeader',
		template:
			'<div data-testid="stub-agent-builder-header" :data-project-name="projectName" :data-artifact-mode="String(artifactMode)"></div>',
		props: [
			'agent',
			'projectId',
			'agentId',
			'projectName',
			'headerActions',
			'beforeRevertToPublished',
			'artifactMode',
		],
		emits: [
			'header-action',
			'open-preview',
			'published',
			'unpublished',
			'reverted',
			'switch-agent',
		],
	},
	AgentBuilderPreviewHeader: {
		name: 'AgentBuilderPreviewHeader',
		template: '<div data-testid="stub-agent-builder-preview-header"></div>',
		props: ['breadcrumbItems', 'sessionTitle', 'sessionId', 'sessionOptions'],
		emits: ['breadcrumb-select', 'session-select', 'new-chat', 'close-preview'],
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
		props: ['embedded', 'projectId', 'agentId', 'openSessionInNewTab'],
	},
	AgentBuilderUnconfiguredEmptyState: {
		name: 'AgentBuilderUnconfiguredEmptyState',
		template: '<div data-testid="stub-agent-builder-unconfigured-empty-state" />',
	},
	N8nButton: {
		template:
			'<button v-bind="$attrs" @click="$emit(\'click\')"><slot /><slot name="icon" /></button>',
		emits: ['click'],
	},
	N8nIcon: {
		template: '<i v-bind="$attrs" :data-icon="icon"></i>',
		props: ['icon', 'size', 'spin'],
	},
	N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
	N8nActionDropdown: { template: '<div />' },
	Transition: { template: '<div><slot/></div>' },
};

describe('AgentBuilderView — preview routing', () => {
	// First Vite transform of this SFC + design-system deps can exceed the default
	// 5s test timeout; warm the module once so each case measures mount behavior.
	beforeAll(async () => {
		await import('../views/AgentBuilderView.vue');
	}, 30_000);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		createObjectURLSpy?.mockRestore();
		revokeObjectURLSpy?.mockRestore();
		anchorClickSpy?.mockRestore();
		createObjectURLSpy = undefined;
		revokeObjectURLSpy = undefined;
		anchorClickSpy = undefined;
		routerPush.mockReset();
		routerReplace.mockReset();
		openModalWithDataMock.mockReset();
		closeModalMock.mockReset();
		agentPermissionsMock.canCreate.value = true;
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canDelete.value = false;
		agentPermissionsMock.canPublish.value = true;
		agentPermissionsMock.canUnpublish.value = true;
		routeName = 'AgentBuilderView';
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		sessionThreads.length = 0;
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		// Reset to a built agent; tests that need an unbuilt agent override locally.
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = withDefaultLlm(intendedConfig);
		updateConfigMock.mockReset();
		updateConfigMock.mockResolvedValue({ versionId: 'v1', stale: false });
		getAgentMock.mockResolvedValue(makeAgentResponse());
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
		listAgentFilesMock.mockReset();
		listAgentFilesMock.mockResolvedValue([]);
		uploadAgentFilesMock.mockReset();
		uploadAgentFilesMock.mockResolvedValue([]);
		warmAgentKnowledgeSandboxMock.mockClear();
		showErrorMock.mockReset();
		fetchConfigMock.mockClear();
		showErrorMock.mockReset();
	});

	it('renders the build chat in the editing experience without the old mode toggle', async () => {
		const wrapper = await renderView();

		await wrapper.find('[data-testid="agent-build-chat-show-button"]').trigger('click');
		await nextTick();

		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]').exists()).toBe(
			true,
		);
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

	it('renders only the full-page preview chat on the preview route', async () => {
		routeName = 'AgentPreviewView';
		routeQuery.continueSessionId = 'thread-1';

		const wrapper = await renderView();
		const preview = wrapper.findComponent({ name: 'AgentPreviewChatPage' });
		const header = wrapper.findComponent({ name: 'AgentBuilderPreviewHeader' });

		expect(preview.exists()).toBe(true);
		expect(preview.props('effectiveSessionId')).toBe('thread-1');
		expect(header.exists()).toBe(true);
		expect(header.props('sessionId')).toBe('thread-1');
		expect(wrapper.findComponent({ name: 'AgentBuilderHeader' }).exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(false);
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

	it('does not upload knowledge files for an unpublished agent', async () => {
		const wrapper = await renderView({ knowledgeBaseEnabled: true });

		wrapper
			.findComponent({ name: 'AgentBuilderEditorColumn' })
			.vm.$emit('upload-files', [new File(['x'], 'notes.txt', { type: 'text/plain' })]);
		await flushPromises();

		expect(uploadAgentFilesMock).not.toHaveBeenCalled();
	});

	it('adds the Knowledge tab only when the knowledge base is enabled', async () => {
		const withoutKnowledge = await renderView();
		expect(
			withoutKnowledge.findComponent({ name: 'AgentBuilderEditorColumn' }).props('mainTabOptions'),
		).not.toContainEqual(expect.objectContaining({ value: 'knowledge' }));

		const withKnowledge = await renderView({ knowledgeBaseEnabled: true });
		expect(
			withKnowledge.findComponent({ name: 'AgentBuilderEditorColumn' }).props('mainTabOptions'),
		).toContainEqual(expect.objectContaining({ value: 'knowledge' }));
	});

	it('marks the knowledge files panel unpublished for an unpublished agent', async () => {
		routeQuery.section = 'knowledge';
		const wrapper = await renderView({ knowledgeBaseEnabled: true });

		expect(wrapper.findComponent({ name: 'AgentFilesPanel' }).props('isPublished')).toBe(false);
	});

	it('marks the knowledge files panel published for a published agent', async () => {
		routeQuery.section = 'knowledge';
		getAgentMock.mockResolvedValue(makeAgentResponse({ activeVersionId: 'v1' }));

		const wrapper = await renderView({ knowledgeBaseEnabled: true });

		expect(wrapper.findComponent({ name: 'AgentFilesPanel' }).props('isPublished')).toBe(true);
	});

	it('does not warm the knowledge sandbox for an unpublished agent', async () => {
		await renderView({ knowledgeBaseEnabled: true });

		expect(warmAgentKnowledgeSandboxMock).not.toHaveBeenCalled();
	});

	it('warms the knowledge sandbox when a published agent page initializes', async () => {
		getAgentMock.mockResolvedValue(makeAgentResponse({ activeVersionId: 'v1' }));

		await renderView({ knowledgeBaseEnabled: true });

		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledTimes(1);
		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledWith(
			{ baseUrl: 'http://localhost:5678' },
			'p1',
			'a1',
		);
	});

	it('keeps unbuilt agents hidden on load until the builder chat is opened', async () => {
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValue(makeAgentResponse({ isRunnable: false }));

		const wrapper = await renderView();

		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(true);
	});

	it('opens the preview route from the header preview action', async () => {
		const wrapper = await renderView();
		const header = wrapper.findComponent({ name: 'AgentBuilderHeader' });

		header.vm.$emit('open-preview');
		await flushPromises();

		expect(routerPush).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'AgentPreviewView',
				params: { projectId: 'p1', agentId: 'a1' },
				query: expect.objectContaining({ continueSessionId: expect.any(String) }),
			}),
		);
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
		sessionThreads.push({ id: 'faulty-thread', updatedAt: '2026-01-01T00:00:00Z' });

		const wrapper = await renderView();
		routerReplace.mockClear();

		(wrapper.vm as unknown as { onContinueLoaded: (count: number) => void }).onContinueLoaded(0);
		await nextTick();
		await flushPromises();

		expect(routerReplace).not.toHaveBeenCalled();
		expect(
			wrapper.findComponent({ name: 'AgentPreviewChatPage' }).props('effectiveSessionId'),
		).toBe('faulty-thread');
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

		wrapper.findComponent({ name: 'AgentBuilderPreviewHeader' }).vm.$emit('new-chat');
		await nextTick();
		await flushPromises();

		expect(warmAgentKnowledgeSandboxMock).toHaveBeenCalledTimes(1);
	});

	it('navigates directly to build chat on startChat for an unbuilt agent', async () => {
		intendedConfig = { name: 'Agent One', instructions: '' };
		mockConfig.value = withDefaultLlm(intendedConfig);
		getAgentMock.mockResolvedValue(makeAgentResponse({ isRunnable: false }));

		const wrapper = await renderView();
		const vm = wrapper.vm as unknown as {
			startChat: (msg: string) => void;
			isBuilt: boolean;
		};

		// Agent has no instructions — isBuilt should be false.
		expect(vm.isBuilt).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);

		vm.startChat('Build me a Slack triage agent');
		await nextTick();

		// No progress screen rendered
		expect(wrapper.find('[data-testid="progress-stub"]').exists()).toBe(false);

		// Build chat panel should be visible
		const buildPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(buildPanel.exists()).toBe(true);
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
		const capabilities = wrapper.findComponent({ name: 'AgentCapabilitiesSection' });

		fetchConfigMock.mockClear();
		getAgentMock.mockClear();
		capabilities.vm.$emit('agent-changed');
		await nextTick();

		expect(getAgentMock).toHaveBeenCalledWith({ baseUrl: 'http://localhost:5678' }, 'p1', 'a1');
		expect(fetchConfigMock).toHaveBeenCalledWith('p1', 'a1');
	});
});

describe('AgentBuilderView — three-column shell', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		routerPush.mockReset();
		routerReplace.mockReset();
		openModalWithDataMock.mockReset();
		closeModalMock.mockReset();
		routeName = 'AgentBuilderView';
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		sessionThreads.length = 0;
		sessionStorage.removeItem('N8N_DEBOUNCE_MULTIPLIER');
		intendedConfig = {
			name: 'Agent One',
			instructions: 'You are a helpful assistant.',
		};
		mockConfig.value = withDefaultLlm(intendedConfig);
		updateConfigMock.mockReset();
		updateConfigMock.mockResolvedValue({ versionId: 'v1', stale: false });
		getAgentMock.mockResolvedValue(makeAgentResponse());
		getIntegrationStatusMock.mockResolvedValue({ status: 'ok', integrations: [] });
		listAgentFilesMock.mockReset();
		listAgentFilesMock.mockResolvedValue([]);
		uploadAgentFilesMock.mockReset();
		uploadAgentFilesMock.mockResolvedValue([]);
		showErrorMock.mockReset();
		fetchConfigMock.mockClear();
	});

	it('hides the build chat by default while keeping the editor visible', async () => {
		const wrapper = await renderView();

		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(true);
	});

	it('restores and hides the build chat from the floating controls', async () => {
		const wrapper = await renderView();

		await wrapper.find('[data-testid="agent-build-chat-show-button"]').trigger('click');
		await nextTick();

		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(false);

		const chatColumn = wrapper.findComponent({ name: 'AgentBuilderChatColumn' });
		chatColumn.vm.$emit('hide');
		await nextTick();

		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(true);
	});

	it('renders a floating hide control in build chat mode', async () => {
		const wrapper = await renderView();

		await wrapper.find('[data-testid="agent-build-chat-show-button"]').trigger('click');
		await nextTick();

		expect(wrapper.find('[data-testid="agent-build-chat-hide-toggle"]').exists()).toBe(true);
	});

	it('renders seeded initial builds from the URL as full-width once initialization settles', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';

		const wrapper = await renderView();

		const chatColumn = wrapper.findComponent({ name: 'AgentBuilderChatColumn' });
		expect(chatColumn.props('isFullWidth')).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(false);
	});

	it('auto-expands seeded initial builds from the URL and clears the query flag', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';

		const wrapper = await renderView();

		const chatColumn = wrapper.findComponent({ name: 'AgentBuilderChatColumn' });
		expect(chatColumn.props('isFullWidth')).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(false);
		expect(routerReplace).toHaveBeenCalledWith({
			query: { prompt: undefined, expandBuildChat: undefined },
		});
	});

	it('keeps an auto-expanded initial build open on config updates before build completion', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';
		const wrapper = await renderView();

		wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).vm.$emit('config-updated');
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).props('isFullWidth')).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(false);
	});

	it('collapses an auto-expanded initial build when the build finishes with written config', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';
		const wrapper = await renderView();

		wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).vm.$emit('build-done');
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).props('isFullWidth')).toBe(
			false,
		);
		expect(wrapper.find('[data-testid="agent-builder-editor-column"]').exists()).toBe(true);
	});

	it('mounts the editor enabled when the initial build completion collapses the chat', async () => {
		routeQuery.prompt = 'Build a recruiting agent';
		routeQuery.expandBuildChat = 'true';
		const wrapper = await renderView();
		const chatColumn = wrapper.findComponent({ name: 'AgentBuilderChatColumn' });

		chatColumn.vm.$emit('update:streaming', true);
		chatColumn.vm.$emit('build-done');
		await flushPromises();

		expect(
			wrapper.findComponent({ name: 'AgentBuilderEditorColumn' }).props('isBuildChatStreaming'),
		).toBe(false);
	});

	it('passes build streaming state to the chat column', async () => {
		const wrapper = await renderView();

		await wrapper.find('[data-testid="agent-build-chat-show-button"]').trigger('click');
		await nextTick();

		const chatColumn = wrapper.findComponent({ name: 'AgentBuilderChatColumn' });

		chatColumn.vm.$emit('update:streaming', true);
		await nextTick();

		expect(
			wrapper.findComponent({ name: 'AgentBuilderChatColumn' }).props('isBuildChatStreaming'),
		).toBe(true);
	});

	it('does not render the old Build/Test toggle inside the chat input footer', async () => {
		const wrapper = await renderView();

		await wrapper.find('[data-testid="agent-build-chat-show-button"]').trigger('click');
		await nextTick();

		const chatPanel = wrapper.find('[data-testid="chat-panel-stub"][data-endpoint="build"]');
		expect(
			chatPanel
				.find('[data-testid="stub-footer-start"] [data-testid="agent-chat-mode-toggle"]')
				.exists(),
		).toBe(false);
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

	it('renders artifact mode with the editor and without the build chat', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactRefreshKey: 0,
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

	it('keeps artifact mode tab switching out of the route query', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactRefreshKey: 0,
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

	it('passes artifact ids and new-tab behavior into the embedded sessions list', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactRefreshKey: 0,
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
			openSessionInNewTab: true,
		});
	});

	it('refreshes the artifact shell when the artifact refresh key changes', async () => {
		const wrapper = await renderView({
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactRefreshKey: 0,
			},
		});
		getAgentMock.mockClear();
		fetchConfigMock.mockClear();

		await wrapper.setProps({ artifactRefreshKey: 1 });
		await flushPromises();

		expect(getAgentMock).toHaveBeenCalledWith({ baseUrl: 'http://localhost:5678' }, 'p2', 'a2');
		expect(fetchConfigMock).toHaveBeenCalledWith('p2', 'a2');
	});

	it('replays artifact refresh key changes that arrive before initialization completes', async () => {
		let resolveAgent!: (agent: ReturnType<typeof makeAgentResponse>) => void;
		getAgentMock.mockReturnValueOnce(new Promise((resolve) => (resolveAgent = resolve)));

		const wrapper = await renderView({
			waitForAsyncSetup: false,
			props: {
				artifactMode: true,
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactRefreshKey: 0,
			},
		});
		await vi.waitFor(() => {
			expect(getAgentMock).toHaveBeenCalledTimes(1);
			expect(fetchConfigMock).toHaveBeenCalledTimes(1);
		});

		await wrapper.setProps({ artifactRefreshKey: 1 });
		await nextTick();
		expect(getAgentMock).toHaveBeenCalledTimes(1);
		expect(fetchConfigMock).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ artifactRefreshKey: 2 });
		await nextTick();
		expect(getAgentMock).toHaveBeenCalledTimes(1);
		expect(fetchConfigMock).toHaveBeenCalledTimes(1);

		resolveAgent(makeAgentResponse());
		await flushPromises();
		await flushPromises();

		expect(getAgentMock).toHaveBeenCalledTimes(2);
		expect(fetchConfigMock).toHaveBeenCalledTimes(2);
		expect(getAgentMock).toHaveBeenLastCalledWith({ baseUrl: 'http://localhost:5678' }, 'p2', 'a2');
		expect(fetchConfigMock).toHaveBeenLastCalledWith('p2', 'a2');
	});

	it('surfaces errors from pending artifact refresh replay', async () => {
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
				artifactProjectId: 'p2',
				artifactAgentId: 'a2',
				artifactRefreshKey: 0,
			},
		});
		await vi.waitFor(() => {
			expect(getAgentMock).toHaveBeenCalledTimes(1);
			expect(fetchConfigMock).toHaveBeenCalledTimes(1);
		});

		await wrapper.setProps({ artifactRefreshKey: 1 });
		await nextTick();

		resolveAgent(makeAgentResponse());
		await flushPromises();
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalledWith(replayError, 'agents.builder.loadError');
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
		const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
		const pinia = createPinia();
		setActivePinia(pinia);

		// A promise that we control — lets us capture the intermediate loading state.
		let resolveAgent!: (v: unknown) => void;
		getAgentMock.mockReturnValueOnce(new Promise((r) => (resolveAgent = r)));

		const wrapper = mount(AgentBuilderView, {
			global: { plugins: [pinia], stubs: commonStubs },
		});

		// initialize() hasn't resolved yet → spinner visible, content hidden.
		await nextTick();
		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);

		// Let initialize() complete.
		resolveAgent(makeAgentResponse());
		await flushPromises();

		// Spinner gone, content rendered.
		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-builder-chat-column"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-build-chat-show-button"]').exists()).toBe(true);
	});

	it('clears the loading spinner and shows an error when initialize() throws (finally path)', async () => {
		const { default: AgentBuilderView } = await import('../views/AgentBuilderView.vue');
		const pinia = createPinia();
		setActivePinia(pinia);

		getAgentMock.mockRejectedValueOnce(new Error('network error'));

		const wrapper = mount(AgentBuilderView, {
			global: { plugins: [pinia], stubs: commonStubs },
		});

		await flushPromises();

		// initialized is set in the `finally` block, so the spinner must be gone.
		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(false);
		// The catch block must have surfaced the error to the user.
		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});
});
