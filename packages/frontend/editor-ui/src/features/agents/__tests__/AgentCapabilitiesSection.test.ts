import { flushPromises, mount } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import type { AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SimplifiedNodeType } from '@/Interface';
import AgentCapabilitiesSection from '../components/AgentCapabilitiesSection.vue';
import type { AgentJsonConfig, AgentJsonToolRef, AgentResource, CustomToolEntry } from '../types';
import { AGENT_SUB_AGENTS_MODAL_KEY, AGENT_TASK_MODAL_KEY } from '../constants';

const getNodeType = vi.fn<(type: string, version?: number) => SimplifiedNodeType | null>(
	() => null,
);

function createNodeType(name: string, displayName: string): SimplifiedNodeType {
	return {
		name,
		displayName,
		description: '',
		group: [],
		icon: 'file:placeholder.svg',
		iconUrl: undefined,
		iconColor: undefined,
		badgeIconUrl: undefined,
		codex: undefined,
		defaults: {},
		outputs: [],
	};
}

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const openModalWithDataSpy = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataSpy }),
}));

const showErrorSpy = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy }),
}));

const projectAgentsListRef = ref<AgentResource[] | null>([]);
const ensureProjectAgentsLoadedSpy = vi.fn();
const refreshProjectAgentsSpy = vi.fn();
vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: projectAgentsListRef,
		ensureLoaded: ensureProjectAgentsLoadedSpy,
		refresh: refreshProjectAgentsSpy,
	}),
}));

const getAgentTasksSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	getAgentTasks: (...args: unknown[]) => getAgentTasksSpy(...args),
}));

const integrationsCatalogRef = ref<Array<{ type: string; label: string; icon?: string }>>([]);
vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: integrationsCatalogRef,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

function mountSection(
	tools: AgentJsonToolRef[],
	customTools: Record<string, CustomToolEntry> = {},
	config: AgentJsonConfig | null = null,
	taskRefs: AgentJsonTaskConfig[] = [],
	projectAgents: AgentResource[] = [],
	extraProps: Record<string, unknown> = {},
	attachTo?: Element,
) {
	projectAgentsListRef.value = projectAgents;

	return mount(AgentCapabilitiesSection, {
		attachTo,
		props: {
			config,
			tools,
			customTools,
			skills: [],
			connectedTriggers: [],
			projectId: 'project-id',
			agentId: 'agent-id',
			isPublished: false,
			taskRefs,
			...extraProps,
		},
		global: {
			stubs: {
				NodeIcon: { template: '<span />' },
				N8nButton: {
					props: ['disabled'],
					template:
						'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
				},
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: {
					template:
						'<span><slot /><span data-testid="stub-tooltip-content"><slot name="content" /></span></span>',
				},
				AgentChannelModal: {
					name: 'AgentChannelModal',
					props: ['view', 'open'],
					template: '<div v-if="open" data-testid="agent-channel-modal-stub" :data-view="view" />',
				},
			},
		},
	});
}

function makeTask(overrides: Partial<AgentTaskDto> = {}): AgentTaskDto {
	return {
		id: 'task-1',
		name: 'Daily summary',
		objective: 'Do X',
		cronExpression: '0 9 * * *',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}

function makeAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		id: 'agent-2',
		name: 'Helper Agent',
		projectId: 'project-id',
		resourceType: 'agent',
		isCompiled: true,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		versionId: 'version-2',
		activeVersionId: 'version-2',
		tools: {},
		skills: {},
		activeVersion: null,
		...overrides,
	};
}

function taskRef(id = 'task-1', enabled = true): AgentJsonTaskConfig {
	return { type: 'task', id, enabled };
}

function configWithMcpServers(
	mcpServers: NonNullable<AgentJsonConfig['mcpServers']>,
): AgentJsonConfig {
	return {
		name: 'Test Agent',
		model: '',
		instructions: '',
		tools: [],
		mcpServers,
	};
}

describe('AgentCapabilitiesSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getAgentTasksSpy.mockResolvedValue([]);
		projectAgentsListRef.value = [];
		ensureProjectAgentsLoadedSpy.mockImplementation(async () => projectAgentsListRef.value ?? []);
		refreshProjectAgentsSpy.mockImplementation(async () => projectAgentsListRef.value ?? []);
		integrationsCatalogRef.value = [];
	});

	it('formats node and custom tool chip labels for display', () => {
		getNodeType.mockReturnValue(null);

		const wrapper = mountSection(
			[
				{
					type: 'node',
					name: 'fetch_webpage',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4.4,
						nodeParameters: {},
					},
				},
				{ type: 'custom', id: 'tool_123' },
			],
			{
				tool_123: {
					code: '',
					descriptor: {
						name: 'seo_analyzer',
						description: 'Analyze HTML for SEO issues',
						systemInstruction: null,
						inputSchema: null,
						outputSchema: null,
						hasSuspend: false,
						hasResume: false,
						hasToMessage: false,
						requireApproval: false,
						providerOptions: null,
					},
				},
			},
		);

		const text = wrapper.text();
		expect(text).toContain('Fetch webpage');
		expect(text).toContain('Seo analyzer');
		expect(text).not.toContain('fetch_webpage');
		expect(text).not.toContain('tool_123');
	});

	it('keeps a single tool of the same type ungrouped', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return createNodeType('n8n-nodes-base.gmailTool', 'Gmail Tool');
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		expect(wrapper.text()).not.toContain('2 Gmail');
		expect(wrapper.text()).toContain('Inbox triage');
	});

	it('groups tools once the same node type reaches the threshold', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return createNodeType('n8n-nodes-base.gmailTool', 'Gmail Tool');
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'send_follow_up',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		expect(wrapper.text()).toContain('2 Gmail');
		expect(wrapper.text()).not.toContain('Inbox triage');
		expect(wrapper.text()).not.toContain('Send follow up');
	});

	it('groups more than two tools of the same node type', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return createNodeType('n8n-nodes-base.gmailTool', 'Gmail Tool');
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'send_follow_up',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'archive_message',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		expect(wrapper.text()).toContain('3 Gmail');
		expect(wrapper.text()).not.toContain('Inbox triage');
		expect(wrapper.text()).not.toContain('Send follow up');
		expect(wrapper.text()).not.toContain('Archive message');
	});

	it('shows MCP servers in the tools row even without regular tools', () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === '@n8n/n8n-nodes-langchain.mcpClientTool') {
				return createNodeType('@n8n/n8n-nodes-langchain.mcpClientTool', 'MCP Client Tool');
			}

			return null;
		});

		const wrapper = mountSection(
			[],
			{},
			configWithMcpServers([
				{
					name: 'github',
					url: 'https://mcp.github.com',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			]),
		);

		expect(wrapper.text()).toContain('Github');
		expect(wrapper.findAll('[data-testid="agent-capabilities-tool-row"]').length).toBe(1);
	});

	it('renders selected sub-agents as chips and opens the add modal from capabilities', async () => {
		const config: AgentJsonConfig = {
			name: 'Test Agent',
			model: '',
			instructions: '',
			tools: [],
			subAgents: {
				maxChildren: 7,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing support requests.' }],
			},
		};
		const wrapper = mountSection(
			[],
			{},
			config,
			[],
			[
				makeAgent(),
				makeAgent({ id: 'agent-3', name: 'Research Agent', versionId: 'version-3' }),
				makeAgent({
					id: 'agent-4',
					name: 'Draft Agent',
					versionId: 'version-4',
					activeVersionId: null,
				}),
				makeAgent({ id: 'agent-id', name: 'Current Agent', versionId: 'version-current' }),
			],
		);
		await flushPromises();

		expect(wrapper.text()).toContain('Helper Agent');
		expect(wrapper.findAll('[data-testid="agent-capabilities-sub-agent-row"]').length).toBe(1);

		await wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').trigger('click');
		await flushPromises();

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: expect.objectContaining({
					agents: [
						{ id: 'agent-3', name: 'Research Agent' },
						{ id: 'agent-4', name: 'Draft Agent' },
					],
				}),
			}),
		);

		const modalCall = openModalWithDataSpy.mock.calls[0]?.[0] as {
			data: { onConfirm: (payload: { agentId: string; useWhen?: string }) => void };
		};
		modalCall.data.onConfirm({
			agentId: 'agent-4',
			useWhen: 'Use for draft research requests.',
		});

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [
						{ agentId: 'agent-2', useWhen: 'Use for billing support requests.' },
						{ agentId: 'agent-4', useWhen: 'Use for draft research requests.' },
					],
				},
			},
		]);
	});

	it('refreshes a stale project-agent cache and renders only the sub-agent name', async () => {
		const child = makeAgent({ id: 'agent-new', name: 'Notion Research Agent' });
		refreshProjectAgentsSpy.mockImplementationOnce(async () => {
			projectAgentsListRef.value = [makeAgent({ id: 'agent-id' }), child];
			return projectAgentsListRef.value;
		});

		const wrapper = mountSection(
			[],
			{},
			{
				name: 'Parent Agent',
				model: '',
				instructions: '',
				tools: [],
				subAgents: { agents: [{ agentId: child.id }] },
			},
			[],
			[makeAgent({ id: 'agent-id' })],
		);
		await flushPromises();

		expect(refreshProjectAgentsSpy).toHaveBeenCalledOnce();
		expect(wrapper.text()).toContain('Notion Research Agent');
		expect(wrapper.text()).not.toContain(child.id);
	});

	it('never exposes an unresolved sub-agent id as the chip label', async () => {
		const missingAgentId = 'agent-missing';
		const wrapper = mountSection(
			[],
			{},
			{
				name: 'Parent Agent',
				model: '',
				instructions: '',
				tools: [],
				subAgents: { agents: [{ agentId: missingAgentId }] },
			},
			[],
			[makeAgent({ id: 'agent-id' })],
		);
		await flushPromises();

		const chip = wrapper.find('[data-testid="agent-capabilities-sub-agent-row"]');
		expect(chip.text()).toContain('agents.builder.subAgents.unavailable');
		expect(chip.text()).not.toContain(missingAgentId);
	});

	it('opens an existing sub-agent chip for editing and removal', async () => {
		const config: AgentJsonConfig = {
			name: 'Test Agent',
			model: '',
			instructions: '',
			tools: [],
			subAgents: {
				maxChildren: 7,
				agents: [
					{ agentId: 'agent-2', useWhen: 'Use for billing support requests.' },
					{ agentId: 'agent-3', useWhen: 'Use for research tasks.' },
				],
			},
		};
		const wrapper = mountSection(
			[],
			{},
			config,
			[],
			[makeAgent(), makeAgent({ id: 'agent-3', name: 'Research Agent', versionId: 'version-3' })],
			{
				validationIssues: [
					{
						code: 'incompatible_reference',
						path: 'subAgents.agents.0.agentId',
						capability: { kind: 'subAgent', id: 'agent-2', index: 0 },
					},
				],
			},
		);
		await flushPromises();

		await wrapper.findAll('[data-testid="agent-capabilities-sub-agent-row"]')[0].trigger('click');

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: expect.objectContaining({
					selectedAgent: { id: 'agent-2', name: 'Helper Agent' },
					useWhen: 'Use for billing support requests.',
					invalidReasons: ['agents.builder.validation.issue.subAgent.incompatibleReference'],
				}),
			}),
		);

		const modalCall = openModalWithDataSpy.mock.calls[0]?.[0] as {
			data: {
				onConfirm: (payload: { agentId: string; useWhen?: string }) => void;
				onRemove: (agentId: string) => void;
			};
		};
		modalCall.data.onConfirm({
			agentId: 'agent-2',
		});

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [
						{ agentId: 'agent-2' },
						{ agentId: 'agent-3', useWhen: 'Use for research tasks.' },
					],
				},
			},
		]);

		modalCall.data.onRemove('agent-2');

		expect(wrapper.emitted('update:config')?.[1]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [{ agentId: 'agent-3', useWhen: 'Use for research tasks.' }],
				},
			},
		]);
	});

	it('keeps legacy sub-agent refs without useWhen editable and removable', async () => {
		const config: AgentJsonConfig = {
			name: 'Test Agent',
			model: '',
			instructions: '',
			tools: [],
			subAgents: {
				maxChildren: 7,
				agents: [{ agentId: 'agent-2' }],
			},
		};
		const wrapper = mountSection([], {}, config, [], [makeAgent()]);
		await flushPromises();

		expect(wrapper.text()).toContain('Helper Agent');
		expect(wrapper.findAll('[data-testid="agent-capabilities-sub-agent-row"]').length).toBe(1);

		await wrapper.find('[data-testid="agent-capabilities-sub-agent-row"]').trigger('click');

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: expect.objectContaining({
					selectedAgent: { id: 'agent-2', name: 'Helper Agent' },
					useWhen: '',
				}),
			}),
		);

		const modalCall = openModalWithDataSpy.mock.calls[0]?.[0] as {
			data: {
				onConfirm: (payload: { agentId: string; useWhen?: string }) => void;
				onRemove: (agentId: string) => void;
			};
		};
		modalCall.data.onConfirm({
			agentId: 'agent-2',
			useWhen: 'Use for billing support requests.',
		});

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [{ agentId: 'agent-2', useWhen: 'Use for billing support requests.' }],
				},
			},
		]);

		modalCall.data.onRemove('agent-2');

		expect(wrapper.emitted('update:config')?.[1]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [],
				},
			},
		]);
	});

	it('renders task chips from task refs and fetched bodies', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);

		const wrapper = mountSection([], {}, null, [taskRef()]);
		await flushPromises();

		expect(wrapper.text()).toContain('Daily summary');
		expect(wrapper.findAll('[data-testid="agent-capabilities-task-row"]').length).toBe(1);
	});

	it('does not load tasks for an agent that has not been saved yet', async () => {
		const wrapper = mountSection([], {}, null, [], [], { agentUnsaved: true });
		await flushPromises();

		expect(getAgentTasksSpy).not.toHaveBeenCalled();
		expect(wrapper.text()).not.toContain('not found');
	});

	it('reloads task bodies when switching agents', async () => {
		getAgentTasksSpy.mockImplementation(
			async (_context: unknown, _projectId: string, agentId: string) =>
				agentId === 'agent-2'
					? [makeTask({ id: 'task-2', name: 'Weekly digest' })]
					: [makeTask({ id: 'task-1', name: 'Daily summary' })],
		);

		const wrapper = mountSection([], {}, null, [taskRef('task-1')]);
		await flushPromises();

		expect(wrapper.text()).toContain('Daily summary');

		await wrapper.setProps({
			agentId: 'agent-2',
			taskRefs: [taskRef('task-2')],
		});
		await flushPromises();

		expect(getAgentTasksSpy).toHaveBeenLastCalledWith({}, 'project-id', 'agent-2');
		expect(wrapper.text()).toContain('Weekly digest');
		expect(wrapper.text()).not.toContain('Daily summary');
	});

	it('opens the task modal when adding or editing a task', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const wrapper = mountSection([], {}, null, [taskRef('task-1', true)]);
		await flushPromises();

		await wrapper.find('[data-testid="agent-capabilities-task-row"]').trigger('click');
		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({
					task: expect.objectContaining({ id: 'task-1' }),
					taskState: {
						enabled: true,
					},
				}),
			}),
		);

		await wrapper.find('[data-testid="agent-capabilities-add-task"]').trigger('click');
		expect(openModalWithDataSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				name: AGENT_TASK_MODAL_KEY,
				data: expect.objectContaining({ task: null }),
			}),
		);
	});

	it('forwards task modal callbacks as capability events', async () => {
		getAgentTasksSpy.mockResolvedValue([makeTask()]);
		const wrapper = mountSection([], {}, null, [taskRef()]);
		await flushPromises();

		await wrapper.find('[data-testid="agent-capabilities-task-row"]').trigger('click');
		const modalData = openModalWithDataSpy.mock.calls[0][0].data;
		modalData.onToggle({ id: 'task-1', enabled: false });
		modalData.onSaved();

		expect(wrapper.emitted('toggle-task')).toEqual([[{ id: 'task-1', enabled: false }]]);
		expect(wrapper.emitted('tasks-changed')).toEqual([[]]);
	});

	it('disables the add-tool and add-skill buttons when disabled (read-only host)', async () => {
		const wrapper = mountSection(
			[],
			{},
			configWithMcpServers([
				{
					name: 'github',
					url: 'https://mcp.github.com',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			]),
			[],
			[],
			{
				skills: [
					{
						id: 'skill-1',
						skill: { name: 'Refund policy', description: '', instructions: '' },
					},
				],
			},
		);
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
		expect(
			wrapper.find('[data-testid="agent-capabilities-add-tool"]').attributes('disabled'),
		).toBeUndefined();
		expect(
			wrapper.find('[data-testid="agent-capabilities-add-skill"]').attributes('disabled'),
		).toBeUndefined();

		await wrapper.setProps({ disabled: true });

		expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
		expect(
			wrapper.find('[data-testid="agent-capabilities-add-tool"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-capabilities-add-skill"]').attributes('disabled'),
		).toBeDefined();

		const toolChip = wrapper.find('[data-testid="agent-capabilities-tool-row"]');
		const skillChip = wrapper.find('[data-testid="agent-capabilities-skill-row"]');
		expect(toolChip.attributes('disabled')).toBeDefined();
		expect(skillChip.attributes('disabled')).toBeDefined();

		await toolChip.trigger('click');
		await skillChip.trigger('click');

		expect(wrapper.emitted('open-tool')).toBeUndefined();
		expect(wrapper.emitted('open-skill')).toBeUndefined();
	});

	it('disables the grouped-tool dropdown menu when disabled (read-only host)', async () => {
		getNodeType.mockImplementation((type: string) => {
			if (type === 'n8n-nodes-base.gmailTool') {
				return createNodeType('n8n-nodes-base.gmailTool', 'Gmail Tool');
			}

			return null;
		});

		const wrapper = mountSection([
			{
				type: 'node',
				name: 'inbox_triage',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{
				type: 'node',
				name: 'send_follow_up',
				node: {
					nodeType: 'n8n-nodes-base.gmailTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
		]);

		// Reka's DropdownMenuTrigger — not the read-only chip inside it — is what
		// actually gates opening the menu, so assert its own disabled state.
		const trigger = wrapper.find('[aria-haspopup="menu"]');
		expect(trigger.attributes('disabled')).toBe('false');

		await wrapper.setProps({ disabled: true });

		expect(wrapper.find('[aria-haspopup="menu"]').attributes('disabled')).toBe('true');
	});

	describe('validation issues', () => {
		it('marks node-tool, MCP-server, and task chips invalid when matching issues are present', async () => {
			getAgentTasksSpy.mockResolvedValue([makeTask()]);

			const tools: AgentJsonToolRef[] = [
				{
					type: 'node',
					name: 'create_issue',
					node: {
						nodeType: 'n8n-nodes-base.linearTool',
						nodeTypeVersion: 1,
						nodeParameters: {},
					},
				},
			];

			const wrapper = mountSection(
				tools,
				{},
				configWithMcpServers([
					{
						name: 'github',
						url: 'https://mcp.github.com',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
					},
				]),
				[taskRef('task-1')],
				[],
				{
					validationIssues: [
						{
							code: 'missing_credential',
							path: 'tools.0.node.credentials.linearOAuth2Api',
							capability: { kind: 'tool', id: 'create_issue', index: 0, toolType: 'node' },
						},
						{
							code: 'missing_credential',
							path: 'mcpServers.0.credential',
							capability: { kind: 'mcpServer', id: 'github', index: 0 },
						},
						{
							code: 'missing_reference',
							path: 'tasks.0.id',
							capability: { kind: 'task', id: 'task-1', index: 0 },
						},
					],
				},
			);
			await flushPromises();

			const toolChips = wrapper.findAll('[data-testid="agent-capabilities-tool-row"]');
			expect(toolChips).toHaveLength(2);
			expect(toolChips.every((chip) => chip.classes().some((c) => c.includes('invalid')))).toBe(
				true,
			);
			expect(wrapper.findAll('[data-testid="agent-chip-invalid-icon"]').length).toBeGreaterThan(0);
			expect(toolChips[0].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.missingCredential',
			);

			const taskChip = wrapper.find('[data-testid="agent-capabilities-task-row"]');
			expect(taskChip.classes().some((c) => c.includes('invalid'))).toBe(true);
			expect(taskChip.find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.missingReference',
			);
		});

		it('marks only the invalid member of a grouped tool inside the dropdown menu', async () => {
			getNodeType.mockImplementation((type: string) => {
				if (type === 'n8n-nodes-base.gmailTool') {
					return createNodeType('n8n-nodes-base.gmailTool', 'Gmail Tool');
				}
				return null;
			});

			const gmailTool = (name: string): AgentJsonToolRef => ({
				type: 'node',
				name,
				node: { nodeType: 'n8n-nodes-base.gmailTool', nodeTypeVersion: 1, nodeParameters: {} },
			});

			const wrapper = mountSection(
				[gmailTool('inbox_triage'), gmailTool('send_follow_up')],
				{},
				null,
				[],
				[],
				{
					validationIssues: [
						{
							code: 'missing_credential',
							path: 'tools.0.node.credentials.gmailOAuth2',
							capability: { kind: 'tool', id: 'inbox_triage', index: 0, toolType: 'node' },
						},
					],
				},
				// Attached mount: the real Reka trigger only opens on trusted-shape
				// pointer events, and the menu teleports to document.body.
				document.body,
			);
			await flushPromises();

			await userEvent.click(wrapper.find('[aria-haspopup="menu"]').element);

			await vi.waitFor(() => {
				expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
			});

			// The warning must sit on the invalid sub-tool (inbox_triage) and not on
			// the valid one (send_follow_up) — a bare count would pass even if the
			// per-sub-tool association were inverted.
			// Labels render humanized: inbox_triage -> "Inbox triage", send_follow_up -> "Send follow up".
			const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
			const invalidItem = menuItems.find((el) => el.textContent?.includes('Inbox triage'));
			const validItem = menuItems.find((el) => el.textContent?.includes('Send follow up'));
			const iconSelector = '[data-testid="agent-capabilities-tool-menu-invalid-icon"]';
			expect(invalidItem?.querySelector(iconSelector)).not.toBeNull();
			expect(validItem?.querySelector(iconSelector)).toBeNull();

			wrapper.unmount();
		});

		it('shows capability-specific tooltip messages for workflow tools and sub-agents', async () => {
			const tools: AgentJsonToolRef[] = [{ type: 'workflow', workflow: 'Ghost' }];
			const config: AgentJsonConfig = {
				name: 'Test Agent',
				model: '',
				instructions: '',
				tools: [],
				subAgents: { agents: [{ agentId: 'sub-1' }] },
			};

			const wrapper = mountSection(tools, {}, config, [], [makeAgent({ id: 'sub-1' })], {
				validationIssues: [
					{
						code: 'missing_reference',
						path: 'tools.0.workflow',
						capability: { kind: 'tool', id: 'Ghost', index: 0, toolType: 'workflow' },
					},
					{
						code: 'incompatible_reference',
						path: 'subAgents.agents.0.agentId',
						capability: { kind: 'subAgent', id: 'sub-1', index: 0 },
					},
				],
			});
			await flushPromises();

			const toolChip = wrapper.find('[data-testid="agent-capabilities-tool-row"]');
			expect(toolChip.find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.missingReference',
			);

			const subAgentChip = wrapper.find('[data-testid="agent-capabilities-sub-agent-row"]');
			expect(subAgentChip.find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.subAgent.incompatibleReference',
			);
		});

		it('uses a reason-specific tooltip for incompatible workflow tools when a reason is set', async () => {
			// Two workflow tools, each incompatible for a different reason. The
			// reason discriminator must select a more specific i18n key than the
			// generic "can't be used as an agent tool" message.
			const tools: AgentJsonToolRef[] = [
				{ type: 'workflow', workflow: 'Has Wait' },
				{ type: 'workflow', workflow: 'No Trigger' },
			];

			const wrapper = mountSection(tools, {}, null, [], [], {
				validationIssues: [
					{
						code: 'incompatible_reference',
						path: 'tools.0.workflow',
						capability: { kind: 'tool', id: 'Has Wait', index: 0, toolType: 'workflow' },
						reason: 'incompatible_nodes',
					},
					{
						code: 'incompatible_reference',
						path: 'tools.1.workflow',
						capability: { kind: 'tool', id: 'No Trigger', index: 1, toolType: 'workflow' },
						reason: 'no_supported_trigger',
					},
				],
			});
			await flushPromises();

			const toolChips = wrapper.findAll('[data-testid="agent-capabilities-tool-row"]');
			expect(toolChips).toHaveLength(2);

			expect(toolChips[0].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.incompatibleNodes',
			);
			expect(toolChips[1].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.noSupportedTrigger',
			);
		});

		it('falls back to the generic incompatible_reference key when the reason is absent or unknown', async () => {
			// Two workflow tools so both issues land on a rendered chip: index 0 has
			// no `reason` (absent), index 1 has an unrecognised `reason` (unknown).
			// Both must resolve to the generic incompatible_reference key.
			const tools: AgentJsonToolRef[] = [
				{ type: 'workflow', workflow: 'No Reason' },
				{ type: 'workflow', workflow: 'Unknown Reason' },
			];

			const wrapper = mountSection(tools, {}, null, [], [], {
				validationIssues: [
					{
						code: 'incompatible_reference',
						path: 'tools.0.workflow',
						capability: { kind: 'tool', id: 'No Reason', index: 0, toolType: 'workflow' },
					},
					{
						code: 'incompatible_reference',
						path: 'tools.1.workflow',
						capability: { kind: 'tool', id: 'Unknown Reason', index: 1, toolType: 'workflow' },
						reason: 'some_future_reason',
					},
				],
			});
			await flushPromises();

			const toolChips = wrapper.findAll('[data-testid="agent-capabilities-tool-row"]');
			expect(toolChips).toHaveLength(2);
			expect(toolChips[0].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.incompatibleReference',
			);
			expect(toolChips[1].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.incompatibleReference',
			);
		});

		it('leaves capability chips unmarked when there are no matching validation issues', () => {
			const tools: AgentJsonToolRef[] = [
				{
					type: 'node',
					name: 'create_issue',
					node: {
						nodeType: 'n8n-nodes-base.linearTool',
						nodeTypeVersion: 1,
						nodeParameters: {},
					},
				},
			];

			const wrapper = mountSection(tools, {}, null, [], [], { validationIssues: [] });
			const chip = wrapper.find('[data-testid="agent-capabilities-tool-row"]');

			expect(chip.classes().some((c) => c.includes('invalid'))).toBe(false);
			expect(wrapper.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(false);
		});
	});

	describe('sections allowlist', () => {
		it('renders every capability section by default', () => {
			const wrapper = mountSection([]);

			expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-task"]').exists()).toBe(true);
		});

		it('renders only the allowlisted sections and skips sub-agents', async () => {
			const wrapper = mount(AgentCapabilitiesSection, {
				props: {
					config: null,
					tools: [],
					customTools: {},
					skills: [],
					projectId: 'project-id',
					agentId: 'agent-id',
					isPublished: false,
					taskRefs: [],
					sections: ['tools', 'tasks', 'skills'],
				},
				global: {
					stubs: {
						NodeIcon: { template: '<span />' },
						N8nButton: {
							props: ['disabled'],
							template:
								'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
						},
						N8nIcon: { template: '<span />' },
						N8nText: { template: '<span><slot /></span>' },
						N8nTooltip: { template: '<span><slot /></span>' },
					},
				},
			});
			await flushPromises();

			// Allowlisted rows present.
			expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-task"]').exists()).toBe(true);

			// Suppressed rows absent.
			expect(wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').exists()).toBe(false);

			// The project-agents list (only needed for sub-agents) is not fetched.
			expect(ensureProjectAgentsLoadedSpy).not.toHaveBeenCalled();
		});
	});
});
