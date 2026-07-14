import { flushPromises, mount } from '@vue/test-utils';
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
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy }),
}));

const projectAgentsListRef = ref<AgentResource[] | null>([]);
const ensureProjectAgentsLoadedSpy = vi.fn();
vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: projectAgentsListRef,
		ensureLoaded: ensureProjectAgentsLoadedSpy,
	}),
}));

const getAgentTasksSpy = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	getAgentTasks: (...args: unknown[]) => getAgentTasksSpy(...args),
}));

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [] },
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
) {
	projectAgentsListRef.value = projectAgents;

	return mount(AgentCapabilitiesSection, {
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
				N8nDropdownMenu: {
					name: 'N8nDropdownMenu',
					props: ['items'],
					emits: ['select'],
					template:
						'<div><slot name="trigger" /><button v-for="item in items" :key="item.id" @click="$emit(\'select\', item.id)">{{ item.label }}</button><slot /></div>',
				},
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<span><slot /></span>' },
				AgentChannelModal: {
					name: 'AgentChannelModal',
					props: ['simpleSetup'],
					template:
						'<div data-testid="agent-channel-modal-stub" :data-simple-setup="simpleSetup" />',
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
		ensureProjectAgentsLoadedSpy.mockResolvedValue([]);
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
					agents: [{ id: 'agent-3', name: 'Research Agent' }],
				}),
			}),
		);

		const modalCall = openModalWithDataSpy.mock.calls[0]?.[0] as {
			data: { onConfirm: (payload: { agentId: string; useWhen?: string }) => void };
		};
		modalCall.data.onConfirm({
			agentId: 'agent-3',
			useWhen: 'Use for research requests.',
		});

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [
						{ agentId: 'agent-2', useWhen: 'Use for billing support requests.' },
						{ agentId: 'agent-3', useWhen: 'Use for research requests.' },
					],
				},
			},
		]);
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
		);
		await flushPromises();

		await wrapper.findAll('[data-testid="agent-capabilities-sub-agent-row"]')[0].trigger('click');

		expect(openModalWithDataSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: expect.objectContaining({
					selectedAgent: { id: 'agent-2', name: 'Helper Agent' },
					useWhen: 'Use for billing support requests.',
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

	it('hides the add-tool and add-skill buttons when disabled (read-only host)', async () => {
		const wrapper = mountSection([]);
		expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);

		await wrapper.setProps({ disabled: true });

		expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(false);
	});

	describe('simpleChannelSetup', () => {
		it('does not force simple setup on the channel modal by default', async () => {
			const wrapper = mountSection([]);

			await wrapper.find('[data-testid="agent-capabilities-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('false');
		});

		it('forwards simpleChannelSetup to the channel modal as simple-setup', async () => {
			const wrapper = mountSection([], {}, null, [], [], { simpleChannelSetup: true });

			await wrapper.find('[data-testid="agent-capabilities-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('true');
		});
	});

	describe('sections allowlist', () => {
		it('renders every section by default', () => {
			const wrapper = mountSection([]);

			expect(wrapper.find('[data-testid="agent-capabilities-add-channel"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-task"]').exists()).toBe(true);
		});

		it('renders only the allowlisted sections and skips channels + sub-agents', async () => {
			const wrapper = mount(AgentCapabilitiesSection, {
				props: {
					config: null,
					tools: [],
					customTools: {},
					skills: [],
					connectedTriggers: [],
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
						AgentChannelModal: { template: '<div data-testid="agent-channel-modal" />' },
					},
				},
			});
			await flushPromises();

			// Allowlisted rows present.
			expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-task"]').exists()).toBe(true);

			// Suppressed rows absent.
			expect(wrapper.find('[data-testid="agent-capabilities-add-channel"]').exists()).toBe(false);
			expect(wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').exists()).toBe(false);
			expect(wrapper.find('[data-testid="agent-capabilities-channel-row"]').exists()).toBe(false);
			expect(wrapper.find('[data-testid="agent-channel-modal"]').exists()).toBe(false);

			// The project-agents list (only needed for sub-agents) is not fetched.
			expect(ensureProjectAgentsLoadedSpy).not.toHaveBeenCalled();
		});
	});
});
