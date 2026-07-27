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

const { showMessageSpy } = vi.hoisted(() => ({ showMessageSpy: vi.fn() }));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: showMessageSpy }),
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
	existingSkillNames?: string[];
	onConfirm: (payload: { id?: string; skill: AgentSkill }) => void;
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
		} = {},
	) {
		setActivePinia(createTestingPinia({ stubActions: false }));
		const uiStore = useUIStore();
		const hostId = options.hostId ?? ref('inline:node-1');

		const localConfig = ref<AgentJsonConfig | null>(
			makeConfig({ skills: options.skillRefs ?? [{ type: 'skill', id: 'skill_triage' }] }),
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
			skill: { ...triage, name: 'Second Skill', allowedTools: ['not_a_configured_tool'] },
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
