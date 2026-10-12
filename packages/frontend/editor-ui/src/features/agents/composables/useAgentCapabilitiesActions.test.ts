import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref } from 'vue';

import {
	useAgentCapabilitiesActions,
	type AgentCapabilitiesTelemetry,
} from './useAgentCapabilitiesActions';
import type {
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolConfig,
	AgentResource,
	AgentSkill,
} from '../types';

const { openModalWithData } = vi.hoisted(() => ({ openModalWithData: vi.fn() }));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData }),
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => ({ name: 'n8n-nodes-base.mcpClientTool', version: 1 }),
	}),
}));
vi.mock('@n8n/composables/useToast', () => ({
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

function makeActions(
	overrides: Partial<AgentJsonConfig> = {},
	telemetry?: AgentCapabilitiesTelemetry,
) {
	const scheduleConfigUpdate = vi.fn();
	const scheduleSkillSave = vi.fn();
	const agent = ref<AgentResource | null>(null);
	const agentId = ref('agent-1');
	const localConfig = ref<AgentJsonConfig | null>(makeConfig(overrides));
	const actions = useAgentCapabilitiesActions({
		localConfig,
		agent,
		projectId: computed(() => 'proj-1'),
		agentId: computed(() => agentId.value),
		connectedTriggers: ref<string[]>([]),
		scheduleConfigUpdate,
		scheduleSkillSave,
		telemetry,
	});
	return { actions, scheduleConfigUpdate, scheduleSkillSave, agent, agentId, localConfig };
}

describe('useAgentCapabilitiesActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards the selected picker mode to the tools modal', () => {
		const { actions } = makeActions();

		actions.onOpenAddToolModal('workflows');

		expect(openModalWithData).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ mode: 'workflows' }) }),
		);
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

	it('changes only the selected skill activation flag through autosave', () => {
		const { actions, scheduleConfigUpdate, scheduleSkillSave } = makeActions({
			skills: [
				{ type: 'skill', id: 'skill-1' },
				{ type: 'skill', id: 'skill-2', enabled: true },
			],
		});

		actions.onToggleSkill({ id: 'skill-1', enabled: false });

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({
			skills: [
				{ type: 'skill', id: 'skill-1', enabled: false },
				{ type: 'skill', id: 'skill-2', enabled: true },
			],
		});
		expect(scheduleSkillSave).not.toHaveBeenCalled();
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
		const { actions, scheduleConfigUpdate, scheduleSkillSave, agent } = makeActions({
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
		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
	});

	it('persists a skill rename without scheduling a config save', () => {
		const skill: AgentSkill = { name: 'PR Reviewer', description: '', instructions: 'Review.' };
		const { actions, scheduleConfigUpdate, scheduleSkillSave, agent } = makeActions({
			skills: [{ type: 'skill', id: 's1' }],
		} as Partial<AgentJsonConfig>);
		agent.value = { id: 'agent-1', skills: { s1: skill } } as unknown as AgentResource;

		actions.onOpenSkillFromList('s1');
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onConfirm: (payload: { id?: string; skill: AgentSkill }) => void };
		};
		modalData.data.onConfirm({ id: 's1', skill: { ...skill, name: 'Renamed skill' } });

		expect(scheduleSkillSave).toHaveBeenCalledWith({
			skillId: 's1',
			skill: expect.objectContaining({ name: 'Renamed skill' }),
		});
		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
		expect(agent.value.skills?.s1?.name).toBe('Renamed skill');
	});

	it.each([0, 1, 2, 3])(
		'removes combined tool entry %i and keeps the other references',
		(index) => {
			const tools: AgentJsonToolConfig[] = [
				{
					type: 'node',
					name: 'get_dates',
					node: { nodeType: 'n8n-nodes-base.dateTimeTool', nodeTypeVersion: 1, nodeParameters: {} },
				},
				{ type: 'workflow', workflow: 'shared-workflow', name: 'First lookup' },
				{ type: 'workflow', workflow: 'shared-workflow', name: 'Second lookup' },
			];
			const mcpServer: AgentJsonMcpServerConfig = {
				name: 'remote',
				url: 'https://example.com/mcp',
				authentication: 'none',
				transport: 'streamableHttp',
			};
			const { actions, scheduleConfigUpdate } = makeActions({ tools, mcpServers: [mcpServer] });
			actions.onRemoveTool(index);
			const expected = [
				{ tools: [tools[1], tools[2]] },
				{ tools: [tools[0], tools[2]] },
				{ tools: [tools[0], tools[1]] },
				{ mcpServers: [] },
			];
			expect(scheduleConfigUpdate).toHaveBeenCalledWith(expected[index]);
		},
	);

	it('keeps MCP servers when the tool in an open modal no longer exists', () => {
		const { actions, scheduleConfigUpdate, localConfig } = makeActions({
			tools: [{ type: 'custom', id: 'helper' }],
			mcpServers: [
				{
					name: 'remote',
					url: 'https://example.com/mcp',
					authentication: 'none',
					transport: 'streamableHttp',
				},
			],
		});
		actions.onOpenToolFromList(0);
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onRemove: () => void };
		};
		localConfig.value!.tools = [];

		modalData.data.onRemove();

		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
	});

	it('removes the MCP server from its modal after the tools list changes', () => {
		const mcpServer: AgentJsonMcpServerConfig = {
			name: 'srv',
			url: 'https://mcp.example.com',
			authentication: 'none',
			transport: 'streamableHttp',
		};
		const { actions, scheduleConfigUpdate, localConfig } = makeActions({
			tools: [{ type: 'node', name: 'get_dates' } as AgentJsonToolConfig],
			mcpServers: [mcpServer],
		});

		actions.onOpenToolFromList(1);

		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { onRemove?: () => void };
		};
		localConfig.value!.tools = [];
		modalData.data.onRemove?.();

		expect(scheduleConfigUpdate).toHaveBeenCalledWith({ mcpServers: [] });
	});
});
