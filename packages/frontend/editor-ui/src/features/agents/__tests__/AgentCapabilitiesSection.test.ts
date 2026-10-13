import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { fireEvent, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { AgentJsonTaskConfig } from '@n8n/api-types';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SimplifiedNodeType } from '@/Interface';
import AgentCapabilitiesSection from '../components/AgentCapabilitiesSection.vue';
import type { AgentJsonConfig, AgentJsonToolRef, AgentResource, CustomToolEntry } from '../types';
import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';

enableAutoUnmount(afterEach);

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

const openModalWithDataSpy = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataSpy }),
}));

const createAgentSpy = vi.fn();
vi.mock('../composables/useCreateAgent', () => ({
	useCreateAgent: () => ({ createAgent: createAgentSpy }),
}));

const canCreateAgentRef = ref(true);
vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canCreate: canCreateAgentRef }),
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

vi.mock('../components/AgentWebSearchSection.vue', () => ({
	default: {
		name: 'AgentWebSearchSection',
		emits: ['update:config'],
		template: '<div data-testid="agent-web-search-section" />',
	},
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
					emits: ['click'],
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
		projectAgentsListRef.value = [];
		ensureProjectAgentsLoadedSpy.mockImplementation(async () => projectAgentsListRef.value ?? []);
		refreshProjectAgentsSpy.mockImplementation(async () => projectAgentsListRef.value ?? []);
		integrationsCatalogRef.value = [];
		canCreateAgentRef.value = true;
	});

	it('renders web search and forwards its config updates', () => {
		const wrapper = mountSection([]);
		const webSearchSection = wrapper.getComponent({ name: 'AgentWebSearchSection' });
		const update = { config: { webSearch: { enabled: false } } };

		webSearchSection.vm.$emit('update:config', update);

		expect(wrapper.emitted('update:config')?.[0]).toEqual([update]);
	});

	it.each([
		['node', 'agent-capabilities-tool-row', 0, 1],
		['custom', 'agent-capabilities-tool-row', 1, 2],
		['workflow', 'agent-capabilities-workflow-row', 0, 0],
		['MCP server', 'agent-capabilities-tool-row', 2, 3],
	])('removes only the selected %s reference', async (_type, testId, chipIndex, configIndex) => {
		getNodeType.mockReturnValue(null);
		const tools: AgentJsonToolRef[] = [
			{ type: 'workflow', workflow: 'shared-workflow', name: 'Lookup' },
			{
				type: 'node',
				name: 'fetch',
				node: {
					nodeType: 'n8n-nodes-base.httpRequestTool',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			},
			{ type: 'custom', id: 'custom-tool' },
		];
		const config = configWithMcpServers([
			{
				name: 'remote',
				url: 'https://example.com/mcp',
				authentication: 'none',
				transport: 'streamableHttp',
			},
		]);
		const wrapper = mountSection(tools, {}, config, [], [], {}, document.body);
		await flushPromises();
		const chip = wrapper.findAll(`[data-testid="${testId}"]`)[chipIndex];

		await chip.trigger('contextmenu');
		const remove = await screen.findByRole('menuitem', {
			name: 'agents.builder.contextMenu.remove',
		});
		expect(screen.getAllByRole('menuitem')).toHaveLength(1);
		// Touch browsers can dispatch a click when the long press ends.
		await fireEvent.click(chip.element);
		expect(wrapper.emitted('open-tool')).toBeUndefined();
		expect(remove).toBeVisible();
		await userEvent.click(remove);

		expect(wrapper.emitted('remove-tool')).toEqual([[configIndex]]);
		expect(wrapper.emitted('open-tool')).toBeUndefined();
	});

	it('forwards skill removal and keeps the other sub-agent settings', async () => {
		const config: AgentJsonConfig = {
			...configWithMcpServers([]),
			subAgents: { maxChildren: 7, agents: [{ agentId: 'agent-2' }, { agentId: 'agent-3' }] },
		};
		const wrapper = mountSection(
			[],
			{},
			config,
			[],
			[makeAgent()],
			{
				skills: [{ id: 'skill-1', skill: { name: 'Triage', description: '', instructions: '' } }],
			},
			document.body,
		);
		await flushPromises();

		await wrapper.get('[data-testid="agent-capabilities-skill-row"]').trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		expect(wrapper.emitted('remove-skill')).toEqual([['skill-1']]);
		expect(wrapper.emitted('open-skill')).toBeUndefined();

		await wrapper
			.findAll('[data-testid="agent-capabilities-sub-agent-row"]')[0]
			.trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		expect(wrapper.emitted('update:config')).toEqual([
			[{ subAgents: { maxChildren: 7, agents: [{ agentId: 'agent-3' }] } }],
		]);
		expect(openModalWithDataSpy).not.toHaveBeenCalled();
	});

	it.each([
		['node', 'agent-capabilities-tool-row', 0, 1],
		['custom', 'agent-capabilities-tool-row', 1, 2],
		['workflow', 'agent-capabilities-workflow-row', 0, 0],
	])(
		'toggles only the selected %s and keeps its settings',
		async (_type, testId, chipIndex, configIndex) => {
			getNodeType.mockReturnValue(null);
			const tools: AgentJsonToolRef[] = [
				{ type: 'workflow', workflow: 'Shared workflow', workflowId: 'wf-1', enabled: false },
				{
					type: 'node',
					name: 'fetch',
					requireApproval: true,
					enabled: false,
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4,
						nodeParameters: { url: 'https://example.com' },
						credentials: { httpBasicAuth: { id: 'credential-1', name: 'Account' } },
					},
				},
				{ type: 'custom', id: 'helper', enabled: false, requireApproval: true },
			];
			const wrapper = mountSection(
				tools,
				{},
				null,
				[],
				[],
				{ supportsActivation: true },
				document.body,
			);
			const chip = wrapper.findAll(`[data-testid="${testId}"]`)[chipIndex];
			expect(chip.attributes('aria-description')).toBe('agents.builder.capabilities.deactivated');
			expect(chip.text()).not.toContain('agents.builder.capabilities.deactivated');
			await chip.trigger('click');
			expect(wrapper.emitted('open-tool')).toHaveLength(1);
			await chip.trigger('contextmenu');
			expect(
				(await screen.findAllByRole('menuitem')).map((item) => item.textContent?.trim()),
			).toEqual(['agents.builder.contextMenu.activate', 'agents.builder.contextMenu.remove']);
			await userEvent.click(
				screen.getByRole('menuitem', { name: 'agents.builder.contextMenu.activate' }),
			);
			const activatedTools = tools.map((tool, index) =>
				index === configIndex ? { ...tool, enabled: true } : tool,
			);
			expect(wrapper.emitted('update:config')).toEqual([[{ tools: activatedTools }]]);
			await wrapper.setProps({ tools: activatedTools });
			expect(chip.attributes('aria-description')).toBeUndefined();
			await chip.trigger('contextmenu');
			await userEvent.click(
				await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.deactivate' }),
			);
			expect(wrapper.emitted('update:config')?.[1]).toEqual([{ tools }]);
			expect(wrapper.emitted('open-tool')).toHaveLength(1);
		},
	);

	it('toggles skills and sub-agents without removing their configuration', async () => {
		const config: AgentJsonConfig = {
			...configWithMcpServers([]),
			subAgents: {
				maxChildren: 7,
				agents: [
					{ agentId: 'agent-2', useWhen: 'Review notes', enabled: false },
					{ agentId: 'agent-3' },
				],
			},
		};
		const wrapper = mountSection(
			[],
			{},
			config,
			[],
			[makeAgent()],
			{
				supportsActivation: true,
				skills: [
					{
						id: 'skill-1',
						enabled: false,
						skill: { name: 'Triage', description: '', instructions: '' },
					},
				],
			},
			document.body,
		);
		await flushPromises();
		const skill = wrapper.get('[data-testid="agent-capabilities-skill-row"]');
		expect(skill.attributes('aria-description')).toBe('agents.builder.capabilities.deactivated');
		await skill.trigger('click');
		expect(wrapper.emitted('open-skill')).toEqual([['skill-1']]);
		await skill.trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.activate' }),
		);
		expect(wrapper.emitted('toggle-skill')).toEqual([[{ id: 'skill-1', enabled: true }]]);

		const subAgent = wrapper.findAll('[data-testid="agent-capabilities-sub-agent-row"]')[0];
		expect(subAgent.attributes('aria-description')).toBe('agents.builder.capabilities.deactivated');
		await subAgent.trigger('contextmenu');
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.activate' }),
		);
		const activatedSubAgents = {
			maxChildren: 7,
			agents: [
				{ agentId: 'agent-2', useWhen: 'Review notes', enabled: true },
				{ agentId: 'agent-3' },
			],
		};
		expect(wrapper.emitted('update:config')).toEqual([[{ subAgents: activatedSubAgents }]]);
		await wrapper.setProps({ config: { ...config, subAgents: activatedSubAgents } });
		await subAgent.trigger('click');
		const modalData = openModalWithDataSpy.mock.calls.at(-1)![0].data;
		modalData.onConfirm({ agentId: 'agent-2', useWhen: 'Review updated notes' });
		expect(wrapper.emitted('update:config')?.[1]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [
						{ agentId: 'agent-2', useWhen: 'Review updated notes', enabled: true },
						{ agentId: 'agent-3' },
					],
				},
			},
		]);
	});

	it.each(['remove', 'deactivate'])(
		'blocks %s when an open menu becomes read-only',
		async (action) => {
			const wrapper = mountSection(
				[{ type: 'custom', id: 'helper' }],
				{},
				null,
				[],
				[],
				{ supportsActivation: true },
				document.body,
			);
			await wrapper.get('[data-testid="agent-capabilities-tool-row"]').trigger('contextmenu');
			const remove = await screen.findByRole('menuitem', {
				name: `agents.builder.contextMenu.${action}`,
			});

			await wrapper.setProps({ disabled: true });
			expect(remove).toHaveAttribute('aria-disabled', 'true');
			await fireEvent.click(remove);
			expect(wrapper.emitted('remove-tool')).toBeUndefined();
			expect(wrapper.emitted('update:config')).toBeUndefined();
		},
	);

	it('toggles individual grouped tools and marks the group only when all are deactivated', async () => {
		getNodeType.mockReturnValue(createNodeType('n8n-nodes-base.slackTool', 'Slack Tool'));
		const tools: AgentJsonToolRef[] = ['send_message', 'read_messages'].map((name, index) => ({
			type: 'node',
			name,
			enabled: index === 0,
			node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1, nodeParameters: {} },
		}));
		const wrapper = mountSection(
			tools,
			{},
			null,
			[],
			[],
			{ supportsActivation: true },
			document.body,
		);
		const group = wrapper.get('[data-testid="agent-capabilities-tool-row"]');
		expect(group.attributes('aria-description')).toBeUndefined();
		await group.trigger('contextmenu');
		expect(
			(await screen.findAllByRole('menuitem')).map((item) => item.textContent?.trim()),
		).toEqual(['agents.builder.contextMenu.remove']);
		await userEvent.keyboard('{Escape}');
		await userEvent.click(group.element);
		expect(await screen.findByRole('menuitem', { name: /Read messages/ })).toHaveTextContent(
			'agents.builder.capabilities.deactivated',
		);
		await fireEvent.contextMenu(screen.getByRole('menuitem', { name: 'Send message' }));
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.deactivate' }),
		);
		const deactivatedTools = [{ ...tools[0], enabled: false }, tools[1]];
		expect(wrapper.emitted('update:config')).toEqual([[{ tools: deactivatedTools }]]);
		await wrapper.setProps({ tools: deactivatedTools });
		expect(group.attributes('aria-description')).toBe('agents.builder.capabilities.deactivated');
		expect(wrapper.emitted('open-tool')).toBeUndefined();
	});

	it('removes a group in one update and preserves tools outside the group', async () => {
		getNodeType.mockImplementation((type) => {
			if (type === 'n8n-nodes-base.slackTool') return createNodeType(type, 'Slack Tool');
			if (type === 'n8n-nodes-base.gmailTool') return createNodeType(type, 'Gmail Tool');
			return null;
		});
		const nodeTool = (name: string, nodeType = 'n8n-nodes-base.slackTool'): AgentJsonToolRef => ({
			type: 'node',
			name,
			node: { nodeType, nodeTypeVersion: 1, nodeParameters: {} },
		});
		const tools: AgentJsonToolRef[] = [
			nodeTool('send_message'),
			{ type: 'workflow', workflow: 'shared-workflow' },
			nodeTool('read_email', 'n8n-nodes-base.gmailTool'),
			nodeTool('read_messages'),
			{ type: 'custom', id: 'helper' },
		];
		const config = configWithMcpServers([
			{
				name: 'remote',
				url: 'https://example.com/mcp',
				authentication: 'none',
				transport: 'streamableHttp',
			},
		]);
		const wrapper = mountSection(
			tools,
			{},
			config,
			[],
			[],
			{
				disabled: true,
				validationIssues: [
					{
						code: 'missing_credential',
						path: 'tools.3.node.credentials',
						capability: { kind: 'tool', index: 3, toolType: 'node' },
					},
				],
			},
			document.body,
		);
		const group = screen.getByRole('button', { name: /2 Slack/ });
		await fireEvent.contextMenu(group);
		expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
		await wrapper.setProps({ disabled: false });
		await fireEvent.contextMenu(group);
		const remove = await screen.findByRole('menuitem', {
			name: 'agents.builder.contextMenu.remove',
		});
		await fireEvent.click(group);
		expect(screen.getAllByRole('menuitem')).toHaveLength(1);
		expect(wrapper.emitted('open-tool')).toBeUndefined();

		await wrapper.setProps({ disabled: true });
		expect(remove).toHaveAttribute('aria-disabled', 'true');
		await fireEvent.click(remove);
		expect(wrapper.emitted('update:config')).toBeUndefined();
		await wrapper.setProps({ disabled: false });
		await userEvent.click(remove);

		const remaining = [tools[1], tools[2], tools[4]];
		expect(wrapper.emitted('update:config')).toEqual([[{ tools: remaining }]]);
		expect(wrapper.emitted('remove-tool')).toBeUndefined();
		await wrapper.setProps({ tools: remaining, validationIssues: [] });
		expect(screen.queryByRole('button', { name: /2 Slack/ })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Read email' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Remote' })).toBeVisible();
		expect(wrapper.find('[data-testid="agent-capabilities-workflow-row"]').exists()).toBe(true);
	});

	it('edits and removes individual grouped tools without removing their siblings', async () => {
		getNodeType.mockReturnValue(createNodeType('n8n-nodes-base.slackTool', 'Slack Tool'));
		const nodeTool = (name: string): AgentJsonToolRef => ({
			type: 'node',
			name,
			node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1, nodeParameters: {} },
		});
		const tools: AgentJsonToolRef[] = [
			{ type: 'workflow', workflow: 'shared-workflow' },
			nodeTool('send_message'),
			nodeTool('read_messages'),
		];
		const wrapper = mountSection(
			tools,
			{},
			null,
			[],
			[],
			{
				validationIssues: [
					{
						code: 'missing_credential',
						path: 'tools.2.node.credentials',
						capability: { kind: 'tool', index: 2, toolType: 'node' },
					},
				],
			},
			document.body,
		);
		await flushPromises();
		const group = wrapper.get('[data-testid="agent-capabilities-tool-row"]');

		await userEvent.click(group.element);
		await userEvent.click(await screen.findByRole('menuitem', { name: 'Send message' }));
		expect(wrapper.emitted('open-tool')).toEqual([
			[{ kind: 'tool', toolType: 'node', id: 'send_message' }],
		]);
		await vi.waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());

		await userEvent.click(group.element);
		const readMessages = await screen.findByRole('menuitem', { name: /Read messages/ });
		await fireEvent.contextMenu(readMessages);
		const remove = await screen.findByRole('menuitem', {
			name: 'agents.builder.contextMenu.remove',
		});
		await fireEvent.click(readMessages);
		expect(wrapper.emitted('open-tool')).toHaveLength(1);
		expect(remove).toBeVisible();
		await userEvent.click(remove);
		expect(wrapper.emitted('remove-tool')).toEqual([[2]]);
		expect(wrapper.emitted('open-tool')).toHaveLength(1);
		await wrapper.setProps({ tools: tools.slice(0, 2), validationIssues: [] });
		await vi.waitFor(() => expect(screen.queryByRole('menuitem')).not.toBeInTheDocument());
		expect(wrapper.findAll('[data-testid="agent-capabilities-tool-row"]')).toHaveLength(1);
		expect(wrapper.get('[data-testid="agent-capabilities-tool-row"]').text()).toBe('Send message');
		expect(wrapper.find('[data-testid="agent-capabilities-workflow-row"]').exists()).toBe(true);
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
					toolPermissions: {
						categories: { read: 'always_allow', write: 'require_approval' },
					},
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
						{
							id: 'agent-2',
							name: 'Helper Agent',
							added: true,
							useWhen: 'Use for billing support requests.',
							invalidReasons: [],
							agentHref: '/projects/project-id/agents/agent-2',
						},
						{
							id: 'agent-3',
							name: 'Research Agent',
							added: false,
							useWhen: undefined,
							invalidReasons: [],
							agentHref: '/projects/project-id/agents/agent-3',
						},
						{
							id: 'agent-4',
							name: 'Draft Agent',
							added: false,
							useWhen: undefined,
							invalidReasons: [],
							agentHref: '/projects/project-id/agents/agent-4',
						},
					],
				}),
			}),
		);

		const modalCall = openModalWithDataSpy.mock.calls[0]?.[0] as {
			data: {
				onCreateAgent?: () => void;
				onConfirm: (payload: { agentId: string; useWhen?: string }) => void;
			};
		};
		modalCall.data.onCreateAgent?.();
		expect(createAgentSpy).toHaveBeenCalledWith('button', 'project-id');

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

	it('omits agent creation when the project does not allow it', async () => {
		canCreateAgentRef.value = false;
		const wrapper = mountSection([], {}, null, [], [makeAgent()]);
		await flushPromises();

		await wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').trigger('click');
		await flushPromises();

		const modalCall = openModalWithDataSpy.mock.calls[0]?.[0] as {
			data: { onCreateAgent?: () => void };
		};
		expect(modalCall.data.onCreateAgent).toBeUndefined();
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
					toolPermissions: {
						categories: { read: 'always_allow', write: 'require_approval' },
					},
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

		const trigger = wrapper.find('[aria-haspopup="menu"]');
		expect(trigger.element).toBeEnabled();

		await wrapper.setProps({ disabled: true });

		expect(wrapper.find('[aria-haspopup="menu"]').element).toBeDisabled();
	});

	describe('validation issues', () => {
		it('marks node-tool and MCP-server chips invalid when matching issues are present', async () => {
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
						toolPermissions: {
							categories: { read: 'always_allow', write: 'require_approval' },
						},
					},
				]),
				[],
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

			const workflowChip = wrapper.find('[data-testid="agent-capabilities-workflow-row"]');
			expect(workflowChip.find('[data-testid="stub-tooltip-content"]').text()).toContain(
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

			const workflowChips = wrapper.findAll('[data-testid="agent-capabilities-workflow-row"]');
			expect(workflowChips).toHaveLength(2);

			expect(workflowChips[0].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.incompatibleNodes',
			);
			expect(workflowChips[1].find('[data-testid="stub-tooltip-content"]').text()).toContain(
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

			const workflowChips = wrapper.findAll('[data-testid="agent-capabilities-workflow-row"]');
			expect(workflowChips).toHaveLength(2);
			expect(workflowChips[0].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.incompatibleReference',
			);
			expect(workflowChips[1].find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.incompatibleReference',
			);
		});

		it('marks an unpublished workflow tool as a warning, not as invalid', async () => {
			const tools: AgentJsonToolRef[] = [
				{ type: 'workflow', workflowId: 'wf-1', workflow: 'Draft Flow' },
			];

			const wrapper = mountSection(tools, {}, null, [], [], {
				validationIssues: [
					{
						code: 'incompatible_reference',
						path: 'tools.0.workflowId',
						capability: { kind: 'tool', id: 'Draft Flow', index: 0, toolType: 'workflow' },
						reason: 'not_published',
					},
				],
			});
			await flushPromises();

			const chip = wrapper.find('[data-testid="agent-capabilities-workflow-row"]');
			expect(chip.classes().some((c) => c.includes('warning'))).toBe(true);
			expect(chip.classes().some((c) => c.includes('invalid'))).toBe(false);
			expect(wrapper.find('[data-testid="agent-chip-warning-icon"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-chip-invalid-icon"]').exists()).toBe(false);
			expect(chip.find('[data-testid="stub-tooltip-content"]').text()).toContain(
				'agents.builder.validation.issue.tool.workflow.notPublished',
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

	describe('capability rows', () => {
		it('renders workflow tools in a separate row and opens the selected workflow', async () => {
			const wrapper = mountSection([
				{
					type: 'node',
					name: 'search',
					node: { nodeType: 'toolSearch', nodeTypeVersion: 1, nodeParameters: {} },
				},
				{ type: 'workflow', workflowId: 'wf-1', workflow: 'Handle refund' },
			]);

			expect(wrapper.findAll('[data-testid="agent-capabilities-tool-row"]')).toHaveLength(1);
			const workflowChip = wrapper.find('[data-testid="agent-capabilities-workflow-row"]');
			expect(workflowChip.exists()).toBe(true);

			await workflowChip.trigger('click');

			expect(wrapper.emitted('open-tool')).toEqual([
				[{ kind: 'tool', toolType: 'workflow', id: 'Handle refund' }],
			]);
		});

		it('emits the picker mode from each add button', async () => {
			const wrapper = mountSection([]);

			await wrapper.find('[data-testid="agent-capabilities-add-tool"]').trigger('click');
			await wrapper.find('[data-testid="agent-capabilities-add-workflow"]').trigger('click');

			expect(wrapper.emitted('add-tool')).toEqual([['tools'], ['workflows']]);
		});
	});

	describe('sections allowlist', () => {
		it('renders every capability section by default', () => {
			const wrapper = mountSection([]);

			expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').exists()).toBe(true);
		});

		it('renders only the allowlisted sections and skips sub-agents', async () => {
			const wrapper = mountSection([], {}, null, [], [], { sections: ['tools', 'skills'] });
			await flushPromises();

			/** Allowlisted rows are present. */
			expect(wrapper.find('[data-testid="agent-capabilities-add-tool"]').exists()).toBe(true);
			expect(wrapper.find('[data-testid="agent-capabilities-add-skill"]').exists()).toBe(true);

			/** Suppressed rows are absent. */
			expect(wrapper.find('[data-testid="agent-capabilities-add-sub-agent"]').exists()).toBe(false);

			/** The project-agent list is not needed for hidden sub-agents. */
			expect(ensureProjectAgentsLoadedSpy).not.toHaveBeenCalled();
		});
	});
});
