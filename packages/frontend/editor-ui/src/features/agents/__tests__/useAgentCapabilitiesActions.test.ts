import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { computed, ref, type Ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { AGENT_TOOLS_MODAL_KEY, AGENT_SKILL_MODAL_KEY } from '../constants';
import { useAgentCapabilitiesActions } from '../composables/useAgentCapabilitiesActions';
import { createAgentSkill, getHubSkill, getNewSkillName } from '../composables/useAgentApi';
import { SKILL_NAME_TAKEN_MESSAGE, type SkillDetail, type SkillListItem } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import type {
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolConfig,
	AgentResource,
	AgentSkill,
} from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

const { showErrorSpy, showMessageSpy } = vi.hoisted(() => ({
	showErrorSpy: vi.fn(),
	showMessageSpy: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy, showMessage: showMessageSpy }),
}));

vi.mock('../composables/useAgentApi', () => ({
	createAgentSkill: vi.fn(),
	getHubSkill: vi.fn(),
	getNewSkillName: vi.fn(),
}));

const { hasScopeSpy } = vi.hoisted(() => ({
	hasScopeSpy: vi.fn(() => false),
}));
vi.mock('@n8n/stores/rbac.store', () => ({
	useRBACStore: () => ({ hasScope: hasScopeSpy }),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Inline Agent',
		model: 'openai/gpt-5',
		instructions: '',
		tools: [],
		mcpServers: [],
		...overrides,
	};
}

function setup(
	overrides: {
		supportsToolApproval?: boolean;
		ensureAgentPersisted?: () => Promise<void>;
		flushConfigSave?: () => Promise<unknown>;
		beforeAgentMutation?: () => Promise<void>;
		refreshAgentAfterMutation?: (projectId: string, agentId: string) => Promise<boolean>;
		agent?: Ref<AgentResource | null>;
		agentId?: Ref<string>;
		projectId?: Ref<string>;
	} = {},
) {
	setActivePinia(createTestingPinia({ stubActions: false }));
	const uiStore = useUIStore();

	const localConfig = ref<AgentJsonConfig | null>(makeConfig());
	const scheduleConfigUpdate = vi.fn();
	const scheduleSkillSave = vi.fn();
	const agentId = overrides.agentId ?? ref('inline:node-1');
	const projectId = overrides.projectId ?? ref('project-1');

	const actions = useAgentCapabilitiesActions({
		localConfig,
		agent: ref<AgentResource | null>(null),
		projectId: computed(() => projectId.value),
		agentId: computed(() => agentId.value),
		connectedTriggers: ref([]),
		scheduleConfigUpdate,
		scheduleSkillSave,
		...overrides,
	});

	return {
		uiStore,
		actions,
		scheduleConfigUpdate,
		scheduleSkillSave,
		localConfig,
		agentId,
		projectId,
	};
}

type ToolsModalData = {
	supportsToolApproval?: boolean;
	onConfirm: (payload: {
		tools?: AgentJsonConfig['tools'];
		mcpServers?: AgentJsonMcpServerConfig[];
	}) => void;
};

describe('useAgentCapabilitiesActions — tools modal host seam', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('routes an MCP-server confirm from the tools modal into the config update', () => {
		const { uiStore, actions, scheduleConfigUpdate } = setup();

		actions.onOpenAddToolModal();

		const modalData = uiStore.modalsById[AGENT_TOOLS_MODAL_KEY].data as unknown as ToolsModalData;
		const mcpServer: AgentJsonMcpServerConfig = {
			name: 'github',
			url: 'https://mcp.example.com',
			transport: 'streamableHttp',
			authentication: 'none',
			toolPermissions: {
				categories: { read: 'always_allow', write: 'require_approval' },
			},
		};
		modalData.onConfirm({ tools: [], mcpServers: [mcpServer] });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ tools: [], mcpServers: [mcpServer] });
	});

	it('forwards the host approval capability into the tools modal data', () => {
		const { uiStore, actions } = setup({ supportsToolApproval: false });

		actions.onOpenAddToolModal();

		const modalData = uiStore.modalsById[AGENT_TOOLS_MODAL_KEY].data as unknown as ToolsModalData;
		expect(modalData.supportsToolApproval).toBe(false);
	});

	it('drops a late confirm when the host identity changed', () => {
		const hostId = ref('inline:node-1');
		setActivePinia(createTestingPinia({ stubActions: false }));
		const uiStore = useUIStore();
		const scheduleConfigUpdate = vi.fn();

		const actions = useAgentCapabilitiesActions({
			localConfig: ref<AgentJsonConfig | null>(makeConfig()),
			agent: ref<AgentResource | null>(null),
			projectId: computed(() => 'project-1'),
			agentId: computed(() => hostId.value),
			connectedTriggers: ref([]),
			scheduleConfigUpdate,
			scheduleSkillSave: vi.fn(),
		});

		actions.onOpenAddToolModal();
		hostId.value = 'inline:node-2';

		const modalData = uiStore.modalsById[AGENT_TOOLS_MODAL_KEY].data as unknown as ToolsModalData;
		modalData.onConfirm({ tools: [], mcpServers: [] });

		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
	});
});

type SkillModalData = {
	skillId?: string;
	skill?: AgentSkill;
	existingSkillNames?: string[];
	hubSkillsEnabled?: boolean;
	outdated?: boolean;
	onUseLatestVersion?: (skillId: string) => void;
	getAttachedSkills?: () => Array<{ id: string; name: string }>;
	canCreateInstanceSkills?: boolean;
	getDefaultName?: (availableTo: string) => Promise<string>;
	onConfirm: (payload: {
		id?: string;
		skill: AgentSkill;
		availableTo?: 'project' | 'agent' | 'instance';
		method?: 'manual' | 'upload';
	}) => unknown;
	onAttach?: (skill: SkillListItem) => Promise<void>;
	onRemove?: (skillId: string) => void;
};

describe('useAgentCapabilitiesActions — localSkills host seam', () => {
	const triage: AgentSkill = {
		name: 'Triage',
		description: 'Triage incoming requests',
		instructions: 'Categorize the request and route it.',
	};

	function setupLocal(
		options: {
			hostId?: ReturnType<typeof ref<string>>;
			skillRefs?: AgentJsonConfig['skills'];
			bodies?: Record<string, AgentSkill>;
			tools?: AgentJsonConfig['tools'];
			mcpServers?: AgentJsonConfig['mcpServers'];
		} = {},
	) {
		setActivePinia(createTestingPinia({ stubActions: false }));
		const uiStore = useUIStore();
		const hostId = options.hostId ?? ref('inline:node-1');

		const localConfig = ref<AgentJsonConfig | null>(
			makeConfig({
				skills: options.skillRefs ?? [{ type: 'skill', id: 'skill_triage' }],
				...(options.tools ? { tools: options.tools } : {}),
				...(options.mcpServers ? { mcpServers: options.mcpServers } : {}),
			}),
		);
		const scheduleConfigUpdate = vi.fn();
		const createSkill = vi.fn();
		const updateSkill = vi.fn();

		const actions = useAgentCapabilitiesActions({
			localConfig,
			agent: ref<AgentResource | null>(null),
			projectId: computed(() => 'project-1'),
			agentId: computed(() => hostId.value ?? ''),
			connectedTriggers: ref([]),
			scheduleConfigUpdate,
			scheduleSkillSave: vi.fn(),
			localSkills: {
				bodies: computed(() => options.bodies ?? { skill_triage: triage }),
				createSkill,
				updateSkill,
			},
		});

		return { uiStore, actions, scheduleConfigUpdate, createSkill, updateSkill, hostId };
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('waits for the unsaved agent to be persisted before creating the skill', async () => {
		let releasePersist: () => void = () => {};
		const persisted = new Promise<void>((resolve) => {
			releasePersist = resolve;
		});
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'skill_new',
			skill: { ...triage, name: 'New Skill' },
			skillHash: 'hash-new',
			versionId: 'v2',
		});
		const { uiStore, actions } = setup({ ensureAgentPersisted: async () => await persisted });

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();

		// The agent does not exist yet, so the skill endpoint would 404.
		expect(createAgentSkill).not.toHaveBeenCalled();

		releasePersist();
		await flushPromises();

		expect(createAgentSkill).toHaveBeenCalled();
	});

	it('records the created skill hash so a follow-up edit is checked against it', async () => {
		const agent = ref<AgentResource | null>({
			id: 'inline:node-1',
			skills: {},
			skillHashes: {},
		} as unknown as AgentResource);
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'skill_new',
			skill: { ...triage, name: 'New Skill' },
			skillHash: 'hash-new',
			versionId: 'v2',
		});
		const { uiStore, actions } = setup({ agent });

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();

		expect(agent.value?.skillHashes).toEqual({ skill_new: 'hash-new' });
	});

	it('flushes pending edits and refreshes the config before applying a created skill ref', async () => {
		const agent = ref<AgentResource | null>({
			id: 'inline:node-1',
			skills: {},
			skillHashes: {},
		} as unknown as AgentResource);
		const beforeAgentMutation = vi.fn().mockResolvedValue(undefined);
		const refreshAgentAfterMutation = vi.fn().mockResolvedValue(true);
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'skill_new',
			skill: { ...triage, name: 'New Skill' },
			skillHash: 'hash-new',
			versionId: 'v2',
		});
		const { uiStore, actions, localConfig, scheduleConfigUpdate } = setup({
			agent,
			beforeAgentMutation,
			refreshAgentAfterMutation,
		});

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();

		expect(beforeAgentMutation).toHaveBeenCalledOnce();
		expect(beforeAgentMutation.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(createAgentSkill).mock.invocationCallOrder[0],
		);
		expect(refreshAgentAfterMutation).toHaveBeenCalledWith('project-1', 'inline:node-1');
		expect(localConfig.value?.skills).toEqual([{ type: 'skill', id: 'skill_new' }]);
		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
		expect(showMessageSpy).not.toHaveBeenCalled();
	});

	it('does not apply a created skill ref after the active agent changes during refresh', async () => {
		let releaseRefresh: (refreshed: boolean) => void = () => {};
		const refresh = new Promise<boolean>((resolve) => {
			releaseRefresh = resolve;
		});
		const agentId = ref('inline:node-1');
		const agent = ref<AgentResource | null>({
			id: 'inline:node-1',
			skills: {},
			skillHashes: {},
		} as unknown as AgentResource);
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'skill_new',
			skill: { ...triage, name: 'New Skill' },
			skillHash: 'hash-new',
			versionId: 'v2',
		});
		const { uiStore, actions, localConfig } = setup({
			agent,
			agentId,
			refreshAgentAfterMutation: async () => await refresh,
		});

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();
		agentId.value = 'inline:node-2';
		agent.value = { id: 'inline:node-2', skills: {} } as unknown as AgentResource;
		localConfig.value = makeConfig();
		releaseRefresh(true);
		await flushPromises();

		expect(localConfig.value.skills).toBeUndefined();
		expect(agent.value.skills).toEqual({});
	});

	it('does not apply a created skill ref after the active project changes during refresh', async () => {
		let releaseRefresh: (refreshed: boolean) => void = () => {};
		const refresh = new Promise<boolean>((resolve) => {
			releaseRefresh = resolve;
		});
		const projectId = ref('project-1');
		const agent = ref<AgentResource | null>({
			id: 'inline:node-1',
			skills: {},
			skillHashes: {},
		} as unknown as AgentResource);
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'skill_new',
			skill: { ...triage, name: 'New Skill' },
			skillHash: 'hash-new',
			versionId: 'v2',
		});
		const { uiStore, actions, localConfig } = setup({
			agent,
			projectId,
			refreshAgentAfterMutation: async () => await refresh,
		});

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();
		projectId.value = 'project-2';
		agent.value = { id: 'inline:node-1', skills: {} } as unknown as AgentResource;
		localConfig.value = makeConfig();
		releaseRefresh(true);
		await flushPromises();

		expect(localConfig.value.skills).toBeUndefined();
		expect(agent.value.skills).toEqual({});
	});

	it('reports a refresh failure without applying a created skill ref to stale config', async () => {
		const agent = ref<AgentResource | null>({
			id: 'inline:node-1',
			skills: {},
			skillHashes: {},
		} as unknown as AgentResource);
		const refreshError = new Error('refresh failed');
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'skill_new',
			skill: { ...triage, name: 'New Skill' },
			skillHash: 'hash-new',
			versionId: 'v2',
		});
		const { uiStore, actions, localConfig } = setup({
			agent,
			refreshAgentAfterMutation: async () => await Promise.reject(refreshError),
		});

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();

		expect(showErrorSpy).toHaveBeenCalledWith(refreshError, 'agents.builder.loadError');
		expect(localConfig.value?.skills).toBeUndefined();
	});

	it('does not create the skill when persisting the agent fails', async () => {
		const { uiStore, actions } = setup({
			ensureAgentPersisted: async () => await Promise.reject(new Error('create failed')),
		});

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });
		await flushPromises();

		expect(createAgentSkill).not.toHaveBeenCalled();
	});

	it('joins applied skills against the seam bodies instead of the agent entity', () => {
		const { actions } = setupLocal();

		expect(actions.appliedSkills.value).toEqual([{ id: 'skill_triage', skill: triage }]);
	});

	it('routes an add-skill confirm to createSkill without a REST call', () => {
		const { uiStore, actions, createSkill } = setupLocal();

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: 'New Skill' } });

		expect(createSkill).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Skill' }));
		expect(createAgentSkill).not.toHaveBeenCalled();
	});

	it('drops allowedTools before persisting and offers no tool list', () => {
		const { uiStore, actions, createSkill } = setupLocal({
			tools: [{ type: 'node', name: 'darwin' } as AgentJsonToolConfig],
		});

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(modalData).not.toHaveProperty('availableTools');
		modalData.onConfirm({
			skill: { ...triage, name: 'Second Skill', allowedTools: ['darwin'] },
		});

		expect(createSkill).toHaveBeenCalledWith(
			expect.not.objectContaining({ allowedTools: expect.anything() }),
		);
	});

	it('rejects an add whose name duplicates an applied skill (case-insensitive, trimmed)', () => {
		const { uiStore, actions, createSkill } = setupLocal();

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ skill: { ...triage, name: ' TRIAGE ' } });

		expect(createSkill).not.toHaveBeenCalled();
		expect(showMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				title: 'agents.builder.skills.duplicateName.error',
			}),
		);
	});

	it("rejects an edit that takes another applied skill's name", () => {
		const { uiStore, actions, updateSkill } = setupLocal({
			skillRefs: [
				{ type: 'skill', id: 'skill_triage' },
				{ type: 'skill', id: 'skill_escalate' },
			],
			bodies: { skill_triage: triage, skill_escalate: { ...triage, name: 'Escalate' } },
		});

		actions.onOpenSkillFromList('skill_escalate');
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ id: 'skill_escalate', skill: { ...triage, name: 'triage' } });

		expect(updateSkill).not.toHaveBeenCalled();
		expect(showMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				title: 'agents.builder.skills.duplicateName.error',
			}),
		);
	});

	it('passes applied skill names into the modal, excluding the edited skill', () => {
		const { uiStore, actions } = setupLocal({
			skillRefs: [
				{ type: 'skill', id: 'skill_triage' },
				{ type: 'skill', id: 'skill_escalate' },
			],
			bodies: { skill_triage: triage, skill_escalate: { ...triage, name: 'Escalate' } },
		});

		actions.onOpenAddSkillModal();
		const addData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(addData.existingSkillNames).toEqual(['Triage', 'Escalate']);

		actions.onOpenSkillFromList('skill_escalate');
		const editData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(editData.existingSkillNames).toEqual(['Triage']);
	});

	it("allows an edit that keeps the skill's own name", () => {
		const { uiStore, actions, updateSkill } = setupLocal();

		actions.onOpenSkillFromList('skill_triage');
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ id: 'skill_triage', skill: { ...triage, description: 'Updated' } });

		expect(updateSkill).toHaveBeenCalledWith(
			'skill_triage',
			expect.objectContaining({ description: 'Updated' }),
		);
	});

	it('routes an edit confirm to updateSkill', () => {
		const { uiStore, actions, updateSkill } = setupLocal();

		actions.onOpenSkillFromList('skill_triage');
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({ id: 'skill_triage', skill: { ...triage, name: 'Renamed' } });

		expect(updateSkill).toHaveBeenCalledWith(
			'skill_triage',
			expect.objectContaining({ name: 'Renamed' }),
		);
	});

	it('drops a late skill confirm when the host identity changed', () => {
		const hostId = ref('inline:node-1');
		const { uiStore, actions, createSkill, updateSkill } = setupLocal({ hostId });

		actions.onOpenAddSkillModal();
		hostId.value = 'inline:node-2';
		const addData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		addData.onConfirm({ skill: triage });
		expect(createSkill).not.toHaveBeenCalled();

		hostId.value = 'inline:node-1';
		actions.onOpenSkillFromList('skill_triage');
		hostId.value = 'inline:node-2';
		const editData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		editData.onConfirm({ id: 'skill_triage', skill: triage });
		expect(updateSkill).not.toHaveBeenCalled();
	});

	it("removes a skill by dropping only the ref — body pruning is the host funnel's job", () => {
		const { actions, scheduleConfigUpdate } = setupLocal();

		actions.onRemoveSkill('skill_triage');

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ skills: [] });
	});

	it('drops a late remove from the skill modal when the host identity changed', () => {
		const hostId = ref('inline:node-1');
		const { uiStore, actions, scheduleConfigUpdate } = setupLocal({ hostId });

		actions.onOpenSkillFromList('skill_triage');
		hostId.value = 'inline:node-2';
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onRemove?.('skill_triage');
		expect(scheduleConfigUpdate).not.toHaveBeenCalled();

		hostId.value = 'inline:node-1';
		modalData.onRemove?.('skill_triage');
		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ skills: [] });
	});

	it('skips malformed skill refs and resolves bodies by own key only', () => {
		const { actions } = setupLocal({
			skillRefs: [
				null,
				{ type: 'skill', id: 42 },
				{ type: 'skill', id: 'constructor' },
			] as unknown as AgentJsonConfig['skills'],
			bodies: {},
		});

		expect(actions.appliedSkills.value).toEqual([
			{ id: 'constructor', skill: { name: 'constructor', description: '', instructions: '' } },
		]);
	});

	it('treats a non-array skills value as no applied skills', () => {
		const { actions } = setupLocal({
			skillRefs: {} as unknown as AgentJsonConfig['skills'],
		});

		expect(actions.appliedSkills.value).toEqual([]);
	});
});

describe('useAgentCapabilitiesActions — skills hub', () => {
	const supportTone: AgentSkill = {
		name: 'Support tone',
		description: 'Use for support replies',
		instructions: 'Be kind.',
	};
	const sqlHelper: AgentSkill = {
		name: 'SQL helper',
		description: 'Use for SQL questions',
		instructions: 'Write SQL.',
	};

	function makeDetail(id: string, skill: AgentSkill): SkillDetail {
		return {
			id,
			name: skill.name,
			description: skill.description,
			scope: 'instance',
			projectId: null,
			projectName: null,
			projectType: null,
			agentId: null,
			agentName: null,
			source: 'ui',
			createdBy: null,
			latestVersion: 1,
			availableToAssistant: false,
			usedByAgents: 0,
			canEdit: false,
			canDelete: false,
			createdAt: '2026-10-01T00:00:00.000Z',
			updatedAt: '2026-10-01T00:00:00.000Z',
			skill,
			skillHash: `hash-${id}`,
			usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
		};
	}

	function setupHub({
		skillsHubEnabled = true,
		flushConfigSave,
	}: { skillsHubEnabled?: boolean; flushConfigSave?: () => Promise<unknown> } = {}) {
		const agent = ref<AgentResource | null>({
			id: 'agent-1',
			skills: { tone: supportTone },
			skillHashes: { tone: 'hash-tone' },
		} as unknown as AgentResource);
		const result = setup({ agent, agentId: ref('agent-1'), flushConfigSave });
		useSettingsStore().moduleSettings.agents = {
			enabled: true,
			modules: [],
			knowledgeBaseEnabled: false,
			proxyEnabled: false,
			skillsHubEnabled,
		};
		result.localConfig.value = makeConfig({ skills: [{ type: 'skill', id: 'tone' }] });
		result.actions.onOpenAddSkillModal();
		const modalData = result.uiStore.modalsById[AGENT_SKILL_MODAL_KEY]
			.data as unknown as SkillModalData;
		return { ...result, agent, modalData };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		hasScopeSpy.mockReturnValue(false);
	});

	it('saves a new agent before it opens the picker', async () => {
		let releasePersist: () => void = () => {};
		const persisted = new Promise<void>((resolve) => {
			releasePersist = resolve;
		});
		const { uiStore, actions } = setup({ ensureAgentPersisted: async () => await persisted });
		useSettingsStore().moduleSettings.agents = {
			enabled: true,
			modules: [],
			knowledgeBaseEnabled: false,
			proxyEnabled: false,
			skillsHubEnabled: true,
		};

		void actions.onOpenAddSkillModal();
		await flushPromises();
		expect(uiStore.modalsById[AGENT_SKILL_MODAL_KEY]?.open).toBeFalsy();

		releasePersist();
		await flushPromises();
		expect(uiStore.modalsById[AGENT_SKILL_MODAL_KEY].open).toBe(true);
	});

	it('reports a failed agent save and keeps the picker closed', async () => {
		const error = new Error('create failed');
		const { uiStore, actions } = setup({
			ensureAgentPersisted: async () => await Promise.reject(error),
		});
		useSettingsStore().moduleSettings.agents = {
			enabled: true,
			modules: [],
			knowledgeBaseEnabled: false,
			proxyEnabled: false,
			skillsHubEnabled: true,
		};

		await actions.onOpenAddSkillModal();

		expect(uiStore.modalsById[AGENT_SKILL_MODAL_KEY]?.open).toBeFalsy();
		expect(showErrorSpy).toHaveBeenCalledWith(error, 'agents.builder.skills.picker.loadError');
	});

	it('opens the add modal with the picker data', () => {
		hasScopeSpy.mockReturnValue(true);
		const { modalData } = setupHub();

		expect(modalData.hubSkillsEnabled).toBe(true);
		expect(modalData.getAttachedSkills?.()).toEqual([{ id: 'tone', name: supportTone.name }]);
		expect(modalData.canCreateInstanceSkills).toBe(true);
		expect(hasScopeSpy).toHaveBeenCalledWith('skill:create');
	});

	it.each([
		['project', { scope: 'project', projectId: 'project-1' }],
		['agent', { scope: 'agent', agentId: 'agent-1' }],
		['instance', { scope: 'instance' }],
	])(
		'asks the server for a default name where "available to" %s puts the skill',
		async (availableTo, target) => {
			vi.mocked(getNewSkillName).mockResolvedValue('New skill 3');
			const { modalData } = setupHub();

			await expect(modalData.getDefaultName?.(availableTo)).resolves.toBe('New skill 3');
			expect(getNewSkillName).toHaveBeenCalledWith(expect.anything(), {
				...target,
				name: 'agents.builder.skills.defaultName',
			});
		},
	);

	it('keeps the modal open with the error on the name when the name is taken', async () => {
		vi.mocked(createAgentSkill).mockRejectedValue(
			new ResponseError(SKILL_NAME_TAKEN_MESSAGE, { httpStatusCode: 409 }),
		);
		const { modalData } = setupHub();

		const result = await modalData.onConfirm({ skill: sqlHelper, availableTo: 'project' });

		expect(result).toEqual({
			saved: false,
			nameError: 'settings.context.skills.error.nameTaken',
		});
		expect(showErrorSpy).not.toHaveBeenCalled();
	});

	it('keeps the modal open and reports any other failed create', async () => {
		const error = new Error('Network down');
		vi.mocked(createAgentSkill).mockRejectedValue(error);
		const { modalData } = setupHub();

		const result = await modalData.onConfirm({ skill: sqlHelper, availableTo: 'project' });

		expect(result).toEqual({ saved: false });
		expect(showErrorSpy).toHaveBeenCalledWith(error, 'agents.builder.skills.create.error');
	});

	it('keeps the picker off and creates the skill on the agent when the skills hub is off', async () => {
		vi.mocked(createAgentSkill).mockResolvedValue({
			id: 'sql',
			skill: sqlHelper,
			skillHash: 'hash-sql',
			versionId: 'v2',
		} as Awaited<ReturnType<typeof createAgentSkill>>);
		const { modalData, actions, uiStore } = setupHub({ skillsHubEnabled: false });

		expect(modalData.hubSkillsEnabled).toBe(false);
		// Without the hub, names are only unique per agent, so the modal numbers them itself.
		expect(modalData.getDefaultName).toBeUndefined();
		modalData.onConfirm({ skill: sqlHelper, availableTo: 'project' });
		await flushPromises();
		expect(createAgentSkill).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			sqlHelper,
			undefined,
			undefined,
		);
		expect(getHubSkill).not.toHaveBeenCalled();

		actions.onOpenSkillFromList('tone');
		const editData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(editData.hubSkillsEnabled).toBe(false);
		expect(editData.outdated).toBe(false);
	});

	it('attaches a hub skill as a ref through the config save, without a copy', async () => {
		vi.mocked(getHubSkill).mockResolvedValue(makeDetail('sql', sqlHelper));
		const { modalData, scheduleConfigUpdate, agent } = setupHub();

		await modalData.onAttach?.({ id: 'sql', name: 'SQL helper' } as SkillListItem);
		await flushPromises();

		expect(getHubSkill).toHaveBeenCalledWith(expect.anything(), 'sql');
		expect(scheduleConfigUpdate).toHaveBeenCalledWith({
			skills: [
				{ type: 'skill', id: 'tone' },
				{ type: 'skill', id: 'sql' },
			],
		});
		expect(agent.value?.skills.sql).toEqual(sqlHelper);
		expect(agent.value?.skillHashes?.sql).toBe('hash-sql');
		expect(createAgentSkill).not.toHaveBeenCalled();
	});

	it('undoes an attach when the config save fails', async () => {
		vi.mocked(getHubSkill).mockResolvedValue(makeDetail('sql', sqlHelper));
		const { modalData, scheduleConfigUpdate, agent } = setupHub({
			flushConfigSave: async () => await Promise.reject(new Error('refused')),
		});

		await modalData.onAttach?.({ id: 'sql', name: 'SQL helper' } as SkillListItem);
		await flushPromises();

		expect(scheduleConfigUpdate).toHaveBeenLastCalledWith({
			skills: [{ type: 'skill', id: 'tone' }],
		});
		expect(agent.value?.skills.sql).toBeUndefined();
		expect(agent.value?.skillHashes?.sql).toBeUndefined();
		expect(agent.value?.skills.tone).toEqual(supportTone);
	});

	it('keeps an attach when the config save succeeds', async () => {
		vi.mocked(getHubSkill).mockResolvedValue(makeDetail('sql', sqlHelper));
		const { modalData, scheduleConfigUpdate, agent } = setupHub({
			flushConfigSave: async () => await Promise.resolve(undefined),
		});

		await modalData.onAttach?.({ id: 'sql', name: 'SQL helper' } as SkillListItem);
		await flushPromises();

		expect(scheduleConfigUpdate).toHaveBeenCalledTimes(1);
		expect(agent.value?.skills.sql).toEqual(sqlHelper);
	});

	it('refuses to attach a skill whose name is hard to tell apart from an attached one', async () => {
		vi.mocked(getHubSkill).mockResolvedValue(
			makeDetail('tone-2', { ...supportTone, name: 'support_tone' }),
		);
		const { modalData, scheduleConfigUpdate } = setupHub();

		await modalData.onAttach?.({ id: 'tone-2', name: 'support_tone' } as SkillListItem);
		await flushPromises();

		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
		expect(showMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'agents.builder.skills.duplicateName.error' }),
		);
	});

	it('reports an attach failure and leaves the config alone', async () => {
		vi.mocked(getHubSkill).mockRejectedValue(new Error('Not found'));
		const { modalData, scheduleConfigUpdate } = setupHub();

		await modalData.onAttach?.({ id: 'sql', name: 'SQL helper' } as SkillListItem);
		await flushPromises();

		expect(showErrorSpy).toHaveBeenCalledWith(
			expect.any(Error),
			'agents.builder.skills.attach.error',
		);
		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
	});

	it.each(['project', 'agent', 'instance'] as const)(
		'creates a skill for the %s through the agent endpoint',
		async (availableTo) => {
			vi.mocked(createAgentSkill).mockResolvedValue({
				id: 'sql',
				skill: sqlHelper,
				skillHash: 'hash-sql',
				versionId: 'v2',
			});
			const { modalData } = setupHub();

			modalData.onConfirm({ skill: sqlHelper, availableTo, method: 'upload' });
			await flushPromises();

			expect(createAgentSkill).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				sqlHelper,
				availableTo,
				'upload',
			);
		},
	);

	it('detaches a skill by dropping its ref only', () => {
		const { actions, scheduleConfigUpdate } = setupHub();

		actions.onRemoveSkill('tone');

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ skills: [] });
	});

	it('detaches a skill from the picker preview by dropping its ref only', () => {
		const { modalData, scheduleConfigUpdate } = setupHub();

		modalData.onRemove?.('tone');

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ skills: [] });
	});

	it('marks a skill on an older version when the edit modal opens', () => {
		const { actions, uiStore, agent } = setupHub();
		agent.value = { ...agent.value, outdatedSkillIds: ['tone'] } as unknown as AgentResource;

		actions.onOpenSkillFromList('tone');

		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(modalData.outdated).toBe(true);
	});

	it('unpins the skill and saves before it opens the latest version in the editor', async () => {
		const latest: AgentSkill = { ...supportTone, instructions: 'Be kind and brief.' };
		vi.mocked(getHubSkill).mockResolvedValue({
			...makeDetail('tone', latest),
			skillHash: 'hash-latest',
		});
		const agent = ref<AgentResource | null>({
			id: 'agent-1',
			skills: { tone: supportTone },
			skillHashes: { tone: 'hash-tone' },
			outdatedSkillIds: ['tone'],
		} as unknown as AgentResource);
		const events: string[] = [];
		const beforeAgentMutation = vi.fn(async () => {
			events.push('flush');
		});
		const { actions, uiStore, localConfig, scheduleConfigUpdate } = setup({
			agent,
			agentId: ref('agent-1'),
			beforeAgentMutation,
		});
		scheduleConfigUpdate.mockImplementation(() => events.push('config'));
		localConfig.value = makeConfig({
			skills: [{ type: 'skill', id: 'tone', versionId: 'v1' }],
		});
		actions.onOpenSkillFromList('tone');
		const outdatedData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY]
			.data as unknown as SkillModalData;

		outdatedData.onUseLatestVersion?.('tone');
		await flushPromises();

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ skills: [{ type: 'skill', id: 'tone' }] });
		expect(events).toEqual(['config', 'flush']);
		expect(agent.value?.skills.tone).toEqual(latest);
		expect(agent.value?.skillHashes?.tone).toBe('hash-latest');
		expect(agent.value?.outdatedSkillIds).toEqual([]);
		const editData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(editData.skill).toEqual(latest);
		expect(editData.outdated).toBe(false);
	});

	function openEdit(options: { skillsHubEnabled?: boolean } = {}) {
		const result = setupHub(options);
		result.actions.onOpenSkillFromList('tone');
		const editData = result.uiStore.modalsById[AGENT_SKILL_MODAL_KEY]
			.data as unknown as SkillModalData;
		return { ...result, editData };
	}

	it('saves the content and the target of an edited skill in one skill save', () => {
		const { editData, scheduleSkillSave } = openEdit();

		editData.onConfirm({ id: 'tone', skill: supportTone, availableTo: 'agent' });

		expect(scheduleSkillSave).toHaveBeenCalledWith({
			skillId: 'tone',
			skill: supportTone,
			availableTo: 'agent',
		});
	});

	it('saves no target when the edit keeps it or the skills hub is off', () => {
		const kept = openEdit();
		kept.editData.onConfirm({ id: 'tone', skill: supportTone });
		const hubOff = openEdit({ skillsHubEnabled: false });
		hubOff.editData.onConfirm({ id: 'tone', skill: supportTone, availableTo: 'agent' });

		expect(kept.scheduleSkillSave).toHaveBeenCalledWith({ skillId: 'tone', skill: supportTone });
		expect(hubOff.scheduleSkillSave).toHaveBeenCalledWith({ skillId: 'tone', skill: supportTone });
	});

	it('tells the edit modal to check the edit permission', () => {
		const { actions, uiStore } = setupHub();

		actions.onOpenSkillFromList('tone');

		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(modalData.skillId).toBe('tone');
		expect(modalData.hubSkillsEnabled).toBe(true);
	});

	it('never enables the hub for a host that keeps its own skill bodies', () => {
		const localConfig = ref<AgentJsonConfig | null>(makeConfig());
		setActivePinia(createTestingPinia({ stubActions: false }));
		const uiStore = useUIStore();
		const actions = useAgentCapabilitiesActions({
			localConfig,
			agent: ref<AgentResource | null>(null),
			projectId: computed(() => 'project-1'),
			agentId: computed(() => 'inline:node-1'),
			connectedTriggers: ref([]),
			scheduleConfigUpdate: vi.fn(),
			scheduleSkillSave: vi.fn(),
			localSkills: { bodies: computed(() => ({})), createSkill: vi.fn(), updateSkill: vi.fn() },
		});

		actions.onOpenAddSkillModal();

		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		expect(modalData.hubSkillsEnabled).toBe(false);
	});
});
