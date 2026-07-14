import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_TOOLS_MODAL_KEY, AGENT_SKILL_MODAL_KEY } from '../constants';
import { useAgentCapabilitiesActions } from '../composables/useAgentCapabilitiesActions';
import { createAgentSkill } from '../composables/useAgentApi';
import type {
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentResource,
	AgentSkill,
} from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('../composables/useAgentApi', () => ({
	createAgentSkill: vi.fn(),
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

function setup(overrides: { supportsToolApproval?: boolean } = {}) {
	setActivePinia(createTestingPinia({ stubActions: false }));
	const uiStore = useUIStore();

	const localConfig = ref<AgentJsonConfig | null>(makeConfig());
	const scheduleConfigUpdate = vi.fn();

	const actions = useAgentCapabilitiesActions({
		localConfig,
		agent: ref<AgentResource | null>(null),
		projectId: computed(() => 'project-1'),
		agentId: computed(() => 'inline:node-1'),
		connectedTriggers: ref([]),
		scheduleConfigUpdate,
		scheduleSkillSave: vi.fn(),
		...overrides,
	});

	return { uiStore, actions, scheduleConfigUpdate, localConfig };
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
	onConfirm: (payload: { id?: string; skill: AgentSkill }) => void;
};

describe('useAgentCapabilitiesActions — localSkills host seam', () => {
	const triage: AgentSkill = {
		name: 'Triage',
		description: 'Triage incoming requests',
		instructions: 'Categorize the request and route it.',
	};

	function setupLocal(options: { hostId?: ReturnType<typeof ref<string>> } = {}) {
		setActivePinia(createTestingPinia({ stubActions: false }));
		const uiStore = useUIStore();
		const hostId = options.hostId ?? ref('inline:node-1');

		const localConfig = ref<AgentJsonConfig | null>(
			makeConfig({ skills: [{ type: 'skill', id: 'skill_triage' }] }),
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
				bodies: computed(() => ({ skill_triage: triage })),
				createSkill,
				updateSkill,
			},
		});

		return { uiStore, actions, scheduleConfigUpdate, createSkill, updateSkill, hostId };
	}

	beforeEach(() => {
		vi.clearAllMocks();
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

	it('filters allowedTools to configured tool names before persisting', () => {
		const { uiStore, actions, createSkill } = setupLocal();

		actions.onOpenAddSkillModal();
		const modalData = uiStore.modalsById[AGENT_SKILL_MODAL_KEY].data as unknown as SkillModalData;
		modalData.onConfirm({
			skill: { ...triage, allowedTools: ['not_a_configured_tool'] },
		});

		expect(createSkill).toHaveBeenCalledWith(
			expect.not.objectContaining({ allowedTools: expect.anything() }),
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
});
