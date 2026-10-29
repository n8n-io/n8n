import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, ref } from 'vue';

import type { SkillDetail, SkillListItem } from '@n8n/api-types';

import {
	useAgentCapabilitiesActions,
	type AgentCapabilitiesTelemetry,
	type UseAgentCapabilitiesActionsDeps,
} from './useAgentCapabilitiesActions';
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import type {
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolConfig,
	AgentResource,
	AgentSkill,
} from '../types';

const { openModalWithData, getSkillDetail } = vi.hoisted(() => ({
	openModalWithData: vi.fn(),
	getSkillDetail: vi.fn(),
}));

vi.mock('./useAgentApi', async (importOriginal) => ({
	...(await importOriginal<typeof import('./useAgentApi')>()),
	getSkillDetail,
}));

vi.mock('@/app/stores/ui.store', () => ({
	// The skill editor is open, as the tests open it before they change a version.
	useUIStore: () => ({ openModalWithData, modalsById: { agentSkillModal: { open: true } } }),
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
	deps: Partial<UseAgentCapabilitiesActionsDeps> = {},
	validationIssues = ref<AgentConfigValidationIssue[]>([]),
) {
	const scheduleConfigUpdate = vi.fn();
	const scheduleSkillSave = vi.fn();
	const agent = ref<AgentResource | null>(null);
	const agentId = ref('agent-1');
	const localConfig = ref<AgentJsonConfig | null>(makeConfig(overrides));
	const connectedTriggers = ref<string[]>([]);
	const actions = useAgentCapabilitiesActions({
		localConfig,
		agent,
		projectId: computed(() => 'proj-1'),
		agentId: computed(() => agentId.value),
		connectedTriggers,
		scheduleConfigUpdate,
		scheduleSkillSave,
		telemetry,
		validationIssues,
		...deps,
	});
	return {
		actions,
		scheduleConfigUpdate,
		scheduleSkillSave,
		agent,
		agentId,
		localConfig,
		connectedTriggers,
	};
}

describe('useAgentCapabilitiesActions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
	});

	it('stores the remaining triggers and tracks a removed trigger', () => {
		const trackTriggerRemoved = vi.fn();
		const { actions, connectedTriggers } = makeActions({}, { trackTriggerRemoved });
		connectedTriggers.value = ['n8n_chat', 'slack'];
		const payload = { triggerType: 'n8n_chat', triggers: ['slack'] };

		actions.onTriggerRemoved(payload);

		expect(connectedTriggers.value).toEqual(['slack']);
		expect(trackTriggerRemoved).toHaveBeenCalledExactlyOnceWith(payload);
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
				onConfirm: (payload: { tools?: AgentJsonToolConfig[]; mcpServers?: unknown[] }) => void;
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

	it("gives the tool modal a live read of that tool's validation issues", () => {
		const issue = (index: number): AgentConfigValidationIssue => ({
			code: 'restricted_node_type',
			reason: 'restricted_by_inline_tool',
			path: `tools.${index}.node.nodeType`,
			capability: { kind: 'tool', index, toolType: 'node' },
			restriction: { nodeType: 'n8n-nodes-base.mySql' },
		});
		const validationIssues = ref<AgentConfigValidationIssue[]>([]);
		const { actions } = makeActions(
			{
				tools: [
					{ type: 'node', name: 'first' } as AgentJsonToolConfig,
					{ type: 'node', name: 'second' } as AgentJsonToolConfig,
				],
			},
			undefined,
			{},
			validationIssues,
		);
		actions.onOpenToolFromList(1);

		const modalData = openModalWithData.mock.calls[0][0] as {
			data: { validationIssues: () => AgentConfigValidationIssue[] };
		};
		expect(modalData.data.validationIssues()).toEqual([]);

		// The builder validates again after the modal opened.
		validationIssues.value = [issue(0), issue(1)];

		expect(modalData.data.validationIssues()).toEqual([issue(1)]);
	});

	it('offers no skill activation toggle', () => {
		const { actions } = makeActions({ skills: [{ type: 'skill', id: 'skill-1' }] });

		expect(actions).not.toHaveProperty('onToggleSkill');
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
					toolPermissions: {
						categories: { read: 'always_allow', write: 'require_approval' },
					},
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

	it('updates and removes only the selected registry MCP server', () => {
		const github: AgentJsonMcpServerConfig = {
			name: 'github',
			url: 'https://mcp.github.test',
			authentication: 'githubOAuth2Api',
			transport: 'streamableHttp',
			metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
		};
		const notion: AgentJsonMcpServerConfig = {
			name: 'notion',
			url: 'https://mcp.notion.test',
			authentication: 'notionMcpOAuth2Api',
			transport: 'streamableHttp',
			metadata: { nodeTypeName: '@n8n/mcp-registry.notion' },
		};
		const { actions, scheduleConfigUpdate } = makeActions({ mcpServers: [github, notion] });

		actions.onOpenToolFromList(0);
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: {
				kind: string;
				onConfirm: (server: AgentJsonMcpServerConfig) => void;
				onRemove: () => void;
			};
		};
		const updated = { ...github, description: 'Updated' };

		expect(modalData.data.kind).toBe('registryMcpServer');
		modalData.data.onConfirm(updated);
		expect(scheduleConfigUpdate).toHaveBeenLastCalledWith({
			mcpServers: [updated, notion],
		});

		modalData.data.onRemove();
		expect(scheduleConfigUpdate).toHaveBeenLastCalledWith({ mcpServers: [notion] });
	});

	it('drops registry MCP callbacks that land after an agent switch', () => {
		const server: AgentJsonMcpServerConfig = {
			name: 'github',
			url: 'https://mcp.github.test',
			authentication: 'githubOAuth2Api',
			transport: 'streamableHttp',
			metadata: { nodeTypeName: '@n8n/mcp-registry.github' },
		};
		const { actions, scheduleConfigUpdate, agentId } = makeActions({ mcpServers: [server] });

		actions.onOpenToolFromList(0);
		const modalData = openModalWithData.mock.calls[0][0] as {
			data: {
				onConfirm: (updated: AgentJsonMcpServerConfig) => void;
				onRemove: () => void;
			};
		};
		agentId.value = 'agent-2';

		modalData.data.onConfirm({ ...server, description: 'Stale edit' });
		modalData.data.onRemove();

		expect(scheduleConfigUpdate).not.toHaveBeenCalled();
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
			toolPermissions: {
				categories: { read: 'always_allow', write: 'require_approval' },
			},
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

	describe('library skills', () => {
		const skill: AgentSkill = { name: 'Tone', description: 'Voice', instructions: 'Be brief.' };
		const detail = { id: 'skill-1', skill, skillHash: 'hash-1' } as SkillDetail;

		async function attach(deps: Partial<UseAgentCapabilitiesActionsDeps>) {
			const made = makeActions({}, undefined, deps);
			made.agent.value = { id: 'agent-1' } as unknown as AgentResource;
			getSkillDetail.mockResolvedValue(detail);
			await made.actions.onOpenAddSkillModal();
			const modalData = openModalWithData.mock.calls[0][0] as {
				data: { onAttach: (item: SkillListItem) => Promise<void> };
			};
			return { ...made, onAttach: modalData.data.onAttach };
		}

		it('attaches a skill to an agent that has no skills yet', async () => {
			const { agent, scheduleConfigUpdate, onAttach } = await attach({});

			await onAttach({ id: 'skill-1' } as SkillListItem);

			expect(agent.value?.skills).toEqual({ 'skill-1': skill });
			expect(agent.value?.skillHashes).toEqual({ 'skill-1': 'hash-1' });
			expect(scheduleConfigUpdate).toHaveBeenCalledWith({
				skills: [{ type: 'skill', id: 'skill-1' }],
			});
		});

		it('takes back an attach that the save refuses', async () => {
			const flushConfigSave = vi.fn().mockRejectedValue(new Error('refused'));
			const { agent, scheduleConfigUpdate, onAttach } = await attach({ flushConfigSave });

			await onAttach({ id: 'skill-1' } as SkillListItem);

			expect(agent.value?.skills).toEqual({});
			expect(agent.value?.skillHashes).toEqual({});
			expect(scheduleConfigUpdate).toHaveBeenLastCalledWith({ skills: [] });
		});

		it('keeps the agent it switched to when a refused attach comes back late', async () => {
			const { agent, agentId, scheduleConfigUpdate, onAttach } = await attach({
				flushConfigSave: async () => {
					agentId.value = 'agent-2';
					throw new Error('refused');
				},
			});

			await onAttach({ id: 'skill-1' } as SkillListItem);

			expect(scheduleConfigUpdate).toHaveBeenCalledTimes(1);
			expect(agent.value?.skills).toEqual({ 'skill-1': skill });
		});

		it('uses the latest version of a skill on an agent without skill maps', async () => {
			const { actions, agent, scheduleConfigUpdate } = makeActions({
				skills: [{ type: 'skill', id: 'skill-1', versionId: 'v1' }],
			} as Partial<AgentJsonConfig>);
			agent.value = { id: 'agent-1' } as unknown as AgentResource;
			getSkillDetail.mockResolvedValue(detail);

			actions.onOpenSkillFromList('skill-1');
			const modalData = openModalWithData.mock.calls[0][0] as {
				data: { onUseLatestVersion: (skillId: string) => void };
			};
			modalData.data.onUseLatestVersion('skill-1');
			await vi.waitFor(() => expect(scheduleConfigUpdate).toHaveBeenCalled());

			expect(agent.value?.skills).toEqual({ 'skill-1': skill });
			expect(agent.value?.skillHashes).toEqual({ 'skill-1': 'hash-1' });
			expect(agent.value?.outdatedSkillIds).toEqual([]);
			expect(scheduleConfigUpdate).toHaveBeenCalledWith({
				skills: [{ type: 'skill', id: 'skill-1' }],
			});
		});
	});
});
