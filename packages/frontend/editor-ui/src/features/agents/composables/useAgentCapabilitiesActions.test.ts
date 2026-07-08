import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref } from 'vue';

import { useAgentCapabilitiesActions } from './useAgentCapabilitiesActions';
import type { AgentJsonConfig, AgentJsonToolConfig, AgentResource, AgentSkill } from '../types';

const { openModalWithData } = vi.hoisted(() => ({ openModalWithData: vi.fn() }));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData }),
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => ({ name: 'n8n-nodes-base.mcpClientTool', version: 1 }),
	}),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'Support Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		tools: [],
		mcpServers: [],
		...overrides,
	} as AgentJsonConfig;
}

function makeActions(overrides: Partial<AgentJsonConfig> = {}) {
	const scheduleConfigUpdate = vi.fn();
	const scheduleSkillSave = vi.fn();
	const agent = ref<AgentResource | null>(null);
	const agentId = ref('agent-1');
	const actions = useAgentCapabilitiesActions({
		localConfig: ref<AgentJsonConfig | null>(makeConfig(overrides)),
		agent,
		projectId: computed(() => 'proj-1'),
		agentId: computed(() => agentId.value),
		connectedTriggers: ref<string[]>([]),
		scheduleConfigUpdate,
		scheduleSkillSave,
	});
	return { actions, scheduleConfigUpdate, scheduleSkillSave, agent, agentId };
}

describe('useAgentCapabilitiesActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('schedules array-shaped tools + mcpServers from the add-tools modal confirm payload', () => {
		// Regression guard: the tools modal confirms with a single object payload
		// (`{ tools, mcpServers }`); the modal-data plumbing is untyped, so a
		// positional handler would silently write that object into `config.tools`
		// and fail backend validation on save.
		const { actions, scheduleConfigUpdate } = makeActions();
		actions.onOpenAddToolModal();

		const modalData = openModalWithData.mock.calls[0][0] as {
			data: {
				onConfirm: (payload: {
					tools?: AgentJsonToolConfig[];
					mcpServers?: unknown[];
				}) => void;
			};
		};
		const tools: AgentJsonToolConfig[] = [{ type: 'custom', id: 'tool-1' }];
		modalData.data.onConfirm({ tools, mcpServers: [] });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ tools, mcpServers: [] });
	});

	it('omits keys the add-tools modal did not send instead of wiping them', () => {
		const { actions, scheduleConfigUpdate } = makeActions();
		actions.onOpenAddToolModal();

		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onConfirm: (payload: { tools?: AgentJsonToolConfig[] }) => void };
		};
		const tools: AgentJsonToolConfig[] = [{ type: 'custom', id: 'tool-1' }];
		modalData.data.onConfirm({ tools });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ tools });
	});

	it('opens the MCP-server modal for a numeric target past the tools array', () => {
		const { actions } = makeActions({
			tools: [{ type: 'node', name: 'get_dates' } as AgentJsonToolConfig],
			mcpServers: [
				{
					name: 'srv',
					url: 'https://mcp.example.com',
					authentication: 'none',
					transport: 'streamableHttp',
				},
			],
		} as Partial<AgentJsonConfig>);

		// Hosts emit offset indices for the combined tools + MCP list; index 1 is
		// past `tools` and must reach the MCP branch instead of no-oping.
		actions.onOpenToolFromList(1);

		expect(openModalWithData).toHaveBeenCalledTimes(1);
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { kind?: string; mcpServer?: { name: string } };
		};
		expect(modalData.data.kind).toBe('mcpServer');
		expect(modalData.data.mcpServer?.name).toBe('srv');
	});

	it('drops a skill-modal confirm that lands after an agent switch', () => {
		const skill: AgentSkill = { name: 'PR Reviewer', description: '', instructions: 'Review.' };
		const { actions, scheduleConfigUpdate, scheduleSkillSave, agent, agentId } = makeActions({
			skills: [{ type: 'skill', id: 's1' }],
		} as Partial<AgentJsonConfig>);
		agent.value = { id: 'agent-1', skills: { s1: skill } } as unknown as AgentResource;

		actions.onOpenSkillFromList('s1');
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onConfirm: (payload: { id?: string; skill: AgentSkill }) => void };
		};

		// The user switched agents while the modal was open: both live refs now
		// point at agent-2, so a live-ref guard would pass and write s1 onto it.
		agentId.value = 'agent-2';
		agent.value = { id: 'agent-2', skills: {} } as unknown as AgentResource;

		modalData.data.onConfirm({ id: 's1', skill: { ...skill, instructions: 'Edited.' } });

		expect(scheduleSkillSave).not.toHaveBeenCalled();
		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
		expect(agent.value.skills).toEqual({});
	});

	it('saves a skill-modal confirm for the agent it was opened on', () => {
		const skill: AgentSkill = { name: 'PR Reviewer', description: '', instructions: 'Review.' };
		const { actions, scheduleSkillSave, agent } = makeActions({
			skills: [{ type: 'skill', id: 's1' }],
		} as Partial<AgentJsonConfig>);
		agent.value = { id: 'agent-1', skills: { s1: skill } } as unknown as AgentResource;

		actions.onOpenSkillFromList('s1');
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onConfirm: (payload: { id?: string; skill: AgentSkill }) => void };
		};
		modalData.data.onConfirm({ id: 's1', skill: { ...skill, instructions: 'Edited.' } });

		expect(scheduleSkillSave).toHaveBeenCalledWith({
			skillId: 's1',
			skill: expect.objectContaining({ instructions: 'Edited.' }),
		});
	});
});
