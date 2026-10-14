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
const { hub, getSkill, showMessage } = vi.hoisted(() => ({
	hub: { enabled: false, canWriteProject: false, canWriteInstance: false },
	getSkill: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock('@/features/settings/context/context.utils', () => ({
	isContextSkillsEnabled: () => hub.enabled,
	canWriteProjectSkillScope: () => hub.canWriteProject,
	canWriteInstanceSkillScope: () => hub.canWriteInstance,
}));
vi.mock('@/features/settings/context/skills.api', () => ({ getSkill }));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		myProjects: [{ id: 'proj-1', name: 'Darwin', type: 'team' }],
		currentProject: null,
	}),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData }),
}));
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => ({ name: 'n8n-nodes-base.mcpClientTool', version: 1 }),
	}),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage }),
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
		hub.enabled = false;
		hub.canWriteProject = false;
		hub.canWriteInstance = false;
	});

	describe('skills hub', () => {
		const lastModal = () =>
			openModalWithData.mock.calls.at(-1)?.[0] as { name: string; data: Record<string, unknown> };

		it('keeps the add-skill modal from before the hub while the flag is off', () => {
			const { actions } = makeActions();

			actions.onOpenAddSkillModal();

			expect(lastModal().name).toBe('agentSkillModal');
			expect(lastModal().data).not.toHaveProperty('scopeOptions');
		});

		it('opens the skill picker while the flag is on', async () => {
			hub.enabled = true;
			const { actions } = makeActions();

			actions.onOpenAddSkillModal();
			await vi.waitFor(() => expect(openModalWithData).toHaveBeenCalled());

			expect(lastModal().name).toBe('agentSkillPickerModal');
			expect(lastModal().data).toMatchObject({ agentId: 'agent-1', projectLabel: 'Darwin' });
		});

		it('attaches a skill as a ref and shows its body before the next fetch', async () => {
			hub.enabled = true;
			const body: AgentSkill = { name: 'brand-voice', description: 'd', instructions: 'Be brief.' };
			getSkill.mockResolvedValue({ skill: body, skillHash: 'hash-1' });
			const { actions, agent, scheduleConfigUpdate } = makeActions({
				skills: [{ type: 'skill', id: 's1' }],
			} as Partial<AgentJsonConfig>);
			agent.value = { id: 'agent-1', skills: {} } as unknown as AgentResource;
			actions.onOpenAddSkillModal();
			await vi.waitFor(() => expect(openModalWithData).toHaveBeenCalled());
			const onAttach = lastModal().data.onAttach as (skill: {
				id: string;
				name: string;
			}) => Promise<boolean>;

			const attached = await onAttach({ id: 's2', name: 'brand-voice' });

			expect(attached).toBe(true);
			expect(scheduleConfigUpdate).toHaveBeenCalledWith({
				skills: [
					{ type: 'skill', id: 's1' },
					{ type: 'skill', id: 's2' },
				],
			});
			expect(agent.value?.skills?.s2).toEqual(body);
		});

		it('refuses a skill whose name is hard to tell apart from an attached one', async () => {
			hub.enabled = true;
			const { actions, agent, scheduleConfigUpdate } = makeActions({
				skills: [{ type: 'skill', id: 's1' }],
			} as Partial<AgentJsonConfig>);
			agent.value = {
				id: 'agent-1',
				skills: { s1: { name: 'Brand voice', description: '', instructions: 'x' } },
			} as unknown as AgentResource;
			actions.onOpenAddSkillModal();
			await vi.waitFor(() => expect(openModalWithData).toHaveBeenCalled());
			const onAttach = lastModal().data.onAttach as (skill: {
				id: string;
				name: string;
			}) => Promise<boolean>;

			const attached = await onAttach({ id: 's2', name: 'brand_voice' });

			expect(attached).toBe(false);
			expect(scheduleConfigUpdate).not.toHaveBeenCalled();
			expect(getSkill).not.toHaveBeenCalled();
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'agents.builder.skills.picker.nameClash' }),
			);
		});

		it('offers this agent first, then the project and Global the user may write to', async () => {
			hub.enabled = true;
			hub.canWriteProject = true;
			const { actions } = makeActions();
			actions.onOpenAddSkillModal();
			await vi.waitFor(() => expect(openModalWithData).toHaveBeenCalled());

			(lastModal().data.onCreate as () => void)();

			expect(lastModal().name).toBe('agentSkillModal');
			expect(lastModal().data.scopeOptions).toEqual([
				{ value: 'agent', label: 'agents.builder.skills.scope.agent', icon: 'bot' },
				{ value: 'project', label: 'Darwin', icon: 'layers' },
			]);
			expect(lastModal().data.initialScope).toBe('agent');
		});

		it('opens an attached skill read-only when the user cannot change it', async () => {
			hub.enabled = true;
			getSkill.mockResolvedValue({ canEdit: false });
			const skill: AgentSkill = { name: 'brand-voice', description: '', instructions: 'x' };
			const { actions, agent } = makeActions({
				skills: [{ type: 'skill', id: 's1' }],
			} as Partial<AgentJsonConfig>);
			agent.value = { id: 'agent-1', skills: { s1: skill } } as unknown as AgentResource;

			actions.onOpenSkillFromList('s1');
			await vi.waitFor(() => expect(openModalWithData).toHaveBeenCalled());

			expect(lastModal().data.readOnly).toBe(true);
		});
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
});
