import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, watchEffect } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

import { mockRestrictedNodeTypes } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { getWorkflow } from '@/app/api/workflows';
import { VIEWS } from '@/app/constants';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { SAMPLE_SUBWORKFLOW_TRIGGER_ID } from '@/app/constants/samples';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { ToolConnectionItem } from '@/features/shared/toolsConnection/types';
import type { IWorkflowDb } from '@/Interface';

import type { ToolPickerMode } from '../components/AgentCapabilitiesSection.types';
import AgentToolsConnectionModalWrapper from '../components/AgentToolsConnectionModalWrapper.vue';
import type { AgentToolConfigModalData } from '../components/AgentToolConfigForm.vue';
import type { AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';

const showMessageMock = vi.fn();
const showErrorMock = vi.fn();
const routerResolveMock = vi.hoisted(() => vi.fn(() => ({ href: '/workflow/new-workflow-id' })));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showError: showErrorMock,
		showMessage: showMessageMock,
		showToast: vi.fn(),
	}),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ resolve: routerResolveMock }),
}));

vi.mock('@/app/api/workflows', () => ({
	getWorkflow: vi.fn(),
}));

const getWorkflowMock = vi.mocked(getWorkflow);

vi.mock('virtual:node-popularity-data', () => ({
	default: [
		{ id: 'n8n-nodes-base.slack', popularity: 100 },
		{ id: 'toolWikipedia', popularity: 40 },
	],
}));

vi.mock('@/app/utils/nodeIcon', () => ({
	getNodeIconSource: () => undefined,
}));

const uuidMockState = vi.hoisted(() => ({ counter: 0 }));
vi.mock('uuid', () => ({ v4: () => `mock-uuid-${++uuidMockState.counter}` }));

const installNodeMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/settings/communityNodes/composables/useInstallNode', () => ({
	useInstallNode: () => ({ installNode: installNodeMock, loading: { value: false } }),
}));

const filterAndSearchNodesMock = vi.hoisted(() => vi.fn(() => [] as unknown[]));
vi.mock('@/features/shared/nodeCreator/nodeCreator.utils', async () => {
	const actual = await vi.importActual<
		typeof import('@/features/shared/nodeCreator/nodeCreator.utils')
	>('@/features/shared/nodeCreator/nodeCreator.utils');
	return { ...actual, filterAndSearchNodes: filterAndSearchNodesMock };
});

/** Uninstalled verified community node, as the previews catalog exposes it. */
const COMMUNITY_PREVIEW: INodeTypeDescription = {
	displayName: 'Firecrawl',
	name: 'n8n-nodes-firecrawl-preview.firecrawlTool',
	group: ['output'],
	version: 1,
	description: 'Scrape sites into markdown',
	defaults: { name: 'Firecrawl' },
	inputs: [],
	outputs: [{ type: NodeConnectionTypes.AiTool }],
	properties: [],
	credentials: [],
};

const COMMUNITY_INSTALLED: INodeTypeDescription = {
	...COMMUNITY_PREVIEW,
	name: 'n8n-nodes-firecrawl.firecrawlTool',
};

const SLACK: INodeTypeDescription = {
	displayName: 'Slack',
	name: 'n8n-nodes-base.slack',
	group: ['output'],
	version: 1,
	description: 'Send messages to Slack',
	defaults: { name: 'Slack' },
	inputs: [],
	outputs: [{ type: NodeConnectionTypes.AiTool }],
	properties: [],
	credentials: [{ name: 'slackApi', required: true }],
};

const WIKIPEDIA: INodeTypeDescription = {
	...SLACK,
	displayName: 'Wikipedia',
	name: 'toolWikipedia',
	description: 'Search Wikipedia',
	defaults: { name: 'Wikipedia' },
	properties: [{ displayName: 'Notice', name: 'notice', type: 'notice', default: '' }],
	credentials: [],
};

const MCP_TOOL: INodeTypeDescription = {
	...SLACK,
	displayName: 'GitHub MCP',
	name: AI_MCP_TOOL_NODE_TYPE,
	description: 'Connect to an MCP server',
	defaults: { name: 'GitHub MCP' },
	credentials: [],
};

let modalAttrs: Record<string, unknown> = {};
let multiStepAttrs: Record<string, unknown> = {};
let configFormData: AgentToolConfigModalData | null = null;
let configuredResult: AgentJsonToolRef | AgentJsonMcpServerConfig | null = null;

const AgentModalMultiStepStub = defineComponent({
	name: 'AgentModalMultiStep',
	inheritAttrs: false,
	props: {
		open: Boolean,
		step: String,
		title: String,
		showBack: Boolean,
		showFooter: Boolean,
	},
	emits: ['update:open', 'update:title', 'back', 'interactOutside'],
	setup(props, { attrs }) {
		watchEffect(() => {
			multiStepAttrs = { ...attrs, ...props };
		});
		return {};
	},
	template: `
		<section v-if="open" data-test-id="agent-modal-multi-step" :data-step="step">
			<header>
				<button v-if="showBack" data-test-id="agent-modal-back" @click="$emit('back')" />
				<span>{{ title }}</span>
			</header>
			<slot />
			<footer v-if="showFooter">
				<slot name="footerLeft" />
				<slot name="footerActions" />
				<slot name="footer" />
			</footer>
		</section>
	`,
});

const AgentToolConfigFormStub = defineComponent({
	name: 'AgentToolConfigForm',
	props: ['data'],
	setup(props, { expose }) {
		watchEffect(() => {
			configFormData = props.data as AgentToolConfigModalData;
		});
		expose({
			confirm: () => {
				const data = props.data as AgentToolConfigModalData;
				const result =
					configuredResult ?? (data.kind === 'mcpServer' ? data.mcpServer : data.toolRef);
				if (data.kind === 'mcpServer') {
					data.onConfirm(result as AgentJsonMcpServerConfig);
				} else {
					data.onConfirm(result as AgentJsonToolRef);
				}
				return true;
			},
			remove: () => (props.data as AgentToolConfigModalData).onRemove?.(),
			changeTitle: vi.fn(),
		});
		return {};
	},
	template: '<div data-test-id="agent-tool-config-form-stub" />',
});

const ToolsConnectionModalStub = defineComponent({
	name: 'ToolsConnectionModal',
	inheritAttrs: false,
	props: {
		persistentScrollbar: Boolean,
	},
	setup(props, { attrs }) {
		watchEffect(() => {
			modalAttrs = { ...attrs, ...props };
		});
		return {};
	},
	template:
		'<div data-test-id="tools-connection-modal-stub"><slot name="suggestion-footer" /></div>',
});

const McpRegistrySuggestionFooterStub = defineComponent({
	name: 'McpRegistrySuggestionFooter',
	props: ['prompt', 'action'],
	template: '<div><span>{{ prompt }}</span><span>{{ action }}</span></div>',
});

function getItems(): ToolConnectionItem[] {
	return (modalAttrs.items as ToolConnectionItem[] | undefined) ?? [];
}

function emitConnect(item: ToolConnectionItem) {
	const listener = modalAttrs.onConnect;
	if (typeof listener !== 'function') throw new Error('Missing onConnect');
	(listener as (item: ToolConnectionItem) => void)(item);
}

function emitOpenDetail(item: ToolConnectionItem) {
	const listener = modalAttrs.onOpenDetail;
	if (typeof listener !== 'function') throw new Error('Missing onOpenDetail');
	(listener as (item: ToolConnectionItem) => void)(item);
}

function emitSearch(query: string) {
	const listener = modalAttrs['onUpdate:searchQuery'] ?? modalAttrs['onUpdate:search-query'];
	if (typeof listener !== 'function') throw new Error('Missing onUpdate:searchQuery');
	(listener as (value: string) => void)(query);
}

function emitCreateWorkflow() {
	const listener = modalAttrs.onCreate;
	if (typeof listener !== 'function') throw new Error('Missing onCreate');
	(listener as () => void)();
}

const MODAL_NAME = 'agentToolsModal';
const PROJECT_ID = 'project-1';

const renderComponent = createComponentRenderer(AgentToolsConnectionModalWrapper, {
	global: {
		stubs: {
			AgentModalMultiStep: AgentModalMultiStepStub,
			AgentToolConfigForm: AgentToolConfigFormStub,
			ToolsConnectionModal: ToolsConnectionModalStub,
			McpRegistrySuggestionFooter: McpRegistrySuggestionFooterStub,
		},
	},
});

describe('AgentToolsConnectionModalWrapper', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let aiGatewayStore: ReturnType<typeof mockedStore<typeof useAiGatewayStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let windowOpenMock: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		uuidMockState.counter = 0;
		modalAttrs = {};
		multiStepAttrs = {};
		configFormData = null;
		configuredResult = null;
		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		uiStore = mockedStore(useUIStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
		settingsStore = mockedStore(useSettingsStore);
		aiGatewayStore = mockedStore(useAiGatewayStore);

		// The gateway is off by default, so the n8n Connect section stays out of
		// the way of the tests that do not opt into it.
		settingsStore.isAiGatewayEnabled = false;
		aiGatewayStore.isNodeSupported = vi.fn().mockReturnValue(false);
		aiGatewayStore.isNodeTypeVersionSupported = vi.fn().mockReturnValue(true);
		aiGatewayStore.isCredentialTypeSupported = vi.fn().mockReturnValue(false);
		nodeTypesStore.getNodeVersions = vi.fn().mockReturnValue([1]);

		workflowsStore = mockedStore(useWorkflowsStore);
		mockedStore(useProjectsStore).myProjects = [
			{
				id: PROJECT_ID,
				scopes: ['workflow:create'],
			},
		] as never;
		mockedStore(useSourceControlStore).preferences = { branchReadOnly: false } as never;

		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === SLACK.name) return SLACK;
			if (name === WIKIPEDIA.name) return WIKIPEDIA;
			return null;
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [SLACK.name, WIKIPEDIA.name],
		};
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([]);
		workflowsStore.createNewWorkflow.mockReset();
		mockedStore(useUsersStore).isAdminOrOwner = true;

		uiStore.modalStateById = {
			[MODAL_NAME]: { open: true, data: {} },
			agentToolConfigModal: { open: false },
		};
		uiStore.closeModal = vi.fn();
		uiStore.openModalWithData = vi.fn();
		showMessageMock.mockReset();
		showErrorMock.mockReset();
		routerResolveMock.mockReset().mockReturnValue({ href: '/workflow/new-workflow-id' });
		windowOpenMock = vi.spyOn(window, 'open').mockImplementation(() => null);
		installNodeMock.mockReset().mockResolvedValue({ success: true });
		filterAndSearchNodesMock.mockReset().mockReturnValue([]);
	});

	function toolRef(nodeType: string): Extract<AgentJsonToolRef, { type: 'node' }> {
		return {
			type: 'node',
			name: nodeType,
			node: {
				nodeType,
				nodeTypeVersion: 1,
				credentials: { slackApi: { id: 'c', name: 'cred' } },
				nodeParameters: {},
			},
		};
	}

	function render(
		tools: AgentJsonToolRef[] = [],
		onConfirm = vi.fn(),
		mcpServers: AgentJsonMcpServerConfig[] = [],
		projectId?: string,
		mode: ToolPickerMode = 'tools',
	) {
		return renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { tools, mcpServers, onConfirm, projectId, mode },
			},
		});
	}

	function getConfigData(): AgentToolConfigModalData {
		if (!configFormData) throw new Error('The configure step is not open');
		return configFormData;
	}

	async function saveConfiguration(
		result?: AgentJsonToolRef | AgentJsonMcpServerConfig,
	): Promise<void> {
		configuredResult = result ?? null;
		const button = document.querySelector('[data-testid="agent-tool-config-save"]');
		if (!(button instanceof HTMLButtonElement)) throw new Error('Missing Save button');
		button.click();
		await flushPromises();
	}

	async function removeConfiguration(): Promise<void> {
		const button = document.querySelector('[data-testid="agent-tool-config-remove"]');
		if (!(button instanceof HTMLButtonElement)) throw new Error('Missing Remove button');
		button.click();
		await flushPromises();
	}

	it('configures the suggestion footer copy', () => {
		const { getByText } = render();

		expect(getByText('Need another capability?')).toBeInTheDocument();
		expect(getByText('Suggest a tool')).toBeInTheDocument();
		expect(modalAttrs.persistentScrollbar ?? modalAttrs['persistent-scrollbar']).toBe(true);
	});

	// DynamicModalLoader passes `open`/`active`/`mode`/`activeId` on top of the
	// declared props. If those fall through onto ToolsConnectionModal the
	// inherited `open` is always true while mounted and would pin the dialog
	// open, so mount the way the loader does and drive it from the store.
	it('does not forward inherited loader attributes to the picker', async () => {
		renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { mode: 'tools', tools: [], onConfirm: vi.fn() },
			},
			attrs: { open: true, active: true, mode: '', activeId: '' },
		});
		await flushPromises();
		expect(modalAttrs.open).toBe(true);
		expect(modalAttrs.active).toBeUndefined();
		expect(modalAttrs.mode).toBeUndefined();
	});

	it('opens configuration as the next step and returns with Back', async () => {
		render();
		await flushPromises();
		expect(modalAttrs.open).toBe(true);

		const slack = getItems().find((item) => item.id === `nodeType:${SLACK.name}`);
		emitConnect(slack!);
		await flushPromises();

		expect(multiStepAttrs.step).toBe('configure');
		expect(getConfigData()).toMatchObject({
			toolRef: { type: 'node', node: { nodeType: SLACK.name } },
		});

		const back = document.querySelector('[data-test-id="agent-modal-back"]');
		if (!(back instanceof HTMLButtonElement)) throw new Error('Missing Back button');
		back.click();
		await flushPromises();

		expect(multiStepAttrs.step).toBe('select');
		expect(modalAttrs.open).toBe(true);
	});

	it('puts native and other node tools in the n8n nodes category', async () => {
		const recommended: INodeTypeDescription = {
			...WIKIPEDIA,
			displayName: 'Gmail',
			name: 'n8n-nodes-base.gmail',
			codex: { subcategories: { Tools: ['Recommended Tools'] } },
		};
		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === SLACK.name) return SLACK;
			if (name === recommended.name) return recommended;
			return null;
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [SLACK.name, recommended.name],
		};

		render();
		await flushPromises();

		const categoryById = new Map(getItems().map((item) => [item.id, item.category]));

		expect(categoryById.get(`nodeType:${SLACK.name}`)).toBe('app-action');
		expect(categoryById.get('nodeType:n8n-nodes-base.gmail')).toBe('app-action');
		expect(modalAttrs.categories).toEqual(['all', 'mcp', 'app-action']);
		expect(getItems().some((item) => item.category === 'workflows')).toBe(false);
	});

	it('shows only workflows in workflow mode', async () => {
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([
			{
				id: 'wf-1',
				name: 'Onboarding',
				isArchived: false,
				nodes: [{ type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When called' }],
			},
		]);

		render([], vi.fn(), [], PROJECT_ID, 'workflows');
		await flushPromises();

		const workflow = getItems().find((item) => item.id === 'workflow:wf-1');
		expect(workflow?.category).toBe('workflows');
		expect(getItems().every((item) => item.category === 'workflows')).toBe(true);
		expect(modalAttrs.categories).toEqual(['workflows']);
		expect(modalAttrs.title).toBe('Add workflow');
		expect(modalAttrs.searchPlaceholder ?? modalAttrs['search-placeholder']).toBe(
			'Search workflows',
		);
		expect(modalAttrs.createAction ?? modalAttrs['create-action']).toMatchObject({
			category: 'workflows',
			label: 'Create workflow',
		});
	});

	it('installs an uninstalled community tool before adding it, and adds the installed type', async () => {
		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === COMMUNITY_INSTALLED.name) return COMMUNITY_INSTALLED;
			return null;
		});
		nodeTypesStore.communityNodeType = vi.fn().mockReturnValue({
			nodeDescription: COMMUNITY_PREVIEW,
			packageName: 'n8n-nodes-firecrawl',
			isOfficialNode: true,
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [COMMUNITY_PREVIEW.name],
		};

		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const preview = getItems().find((item) => item.id === `nodeType:${COMMUNITY_PREVIEW.name}`);
		expect(preview).toMatchObject({
			category: 'app-action',
			communityPreview: true,
			verified: true,
		});

		emitConnect(preview!);
		await flushPromises();

		expect(installNodeMock).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'verified',
				packageName: 'n8n-nodes-firecrawl',
				nodeType: 'n8n-nodes-firecrawl-preview.firecrawl',
			}),
		);

		expect(getConfigData()).toMatchObject({
			toolRef: { type: 'node', node: { nodeType: COMMUNITY_INSTALLED.name } },
		});
		await saveConfiguration();

		// The tool that gets added is the installed type, not the preview.
		const [{ tools }] = onConfirm.mock.calls[0];
		expect(tools[0].node.nodeType).toBe(COMMUNITY_INSTALLED.name);
	});

	it('does not install a community tool via the row body when the user cannot install', async () => {
		nodeTypesStore.communityNodeType = vi.fn().mockReturnValue({
			nodeDescription: COMMUNITY_PREVIEW,
			packageName: 'n8n-nodes-firecrawl',
			isOfficialNode: true,
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [COMMUNITY_PREVIEW.name],
		};
		mockedStore(useUsersStore).isAdminOrOwner = false;

		render();
		await flushPromises();

		const preview = getItems().find((item) => item.id === `nodeType:${COMMUNITY_PREVIEW.name}`);
		expect(preview?.installDisabled).toBe(true);

		emitOpenDetail(preview!);
		await flushPromises();

		expect(installNodeMock).not.toHaveBeenCalled();
	});

	it('surfaces searched community tools that only resolve by their properties name', async () => {
		// The real store normalizes the tool suffix, so match on the package prefix.
		nodeTypesStore.communityNodeType = vi
			.fn()
			.mockImplementation((name: string) =>
				name.startsWith('n8n-nodes-firecrawl')
					? { nodeDescription: COMMUNITY_PREVIEW, isOfficialNode: true }
					: undefined,
			);
		// `key` resolves to nothing; only `properties.name` does.
		filterAndSearchNodesMock.mockReturnValue([
			{ type: 'node', key: 'unresolvable-key', properties: { name: COMMUNITY_PREVIEW.name } },
		]);

		render();
		await flushPromises();

		expect(
			getItems().find((item) => item.id === `nodeType:${COMMUNITY_PREVIEW.name}`),
		).toBeUndefined();

		emitSearch('firecrawl');
		await flushPromises();

		const hit = getItems().find((item) => item.id === `nodeType:${COMMUNITY_PREVIEW.name}`);
		expect(hit).toMatchObject({ category: 'app-action', verified: true });
	});

	it('maps connected tools and keeps the same node type available for duplicates', async () => {
		render([toolRef(SLACK.name)]);
		await flushPromises();

		const items = getItems();
		const connected = items.filter((item) => item.status === 'connected');
		const availableSlack = items.filter(
			(item) =>
				item.status === 'none' && item.kind === 'node' && item.id === `nodeType:${SLACK.name}`,
		);

		expect(connected).toHaveLength(1);
		expect(connected[0].id).toMatch(/^tool:/);
		expect(connected[0].title).toBe(SLACK.name);
		expect(availableSlack).toHaveLength(1);
	});

	it('excludes workflow refs from tool mode and preserves them when a node tool is added', async () => {
		const workflowRef: AgentJsonToolRef = {
			type: 'workflow',
			workflowId: 'workflow-1',
			workflow: 'Daily sales digest',
			name: 'Daily sales digest',
			description: 'Build the daily sales digest',
			allOutputs: false,
		};
		const onConfirm = vi.fn();
		render([workflowRef], onConfirm);
		await flushPromises();

		expect(getItems().some((item) => item.kind === 'workflow')).toBe(false);

		const slack = getItems().find((item) => item.id === `nodeType:${SLACK.name}`);
		emitConnect(slack!);
		await flushPromises();

		const configuredRef = toolRef(SLACK.name);
		await saveConfiguration(configuredRef);

		expect(onConfirm).toHaveBeenCalledWith({
			tools: [workflowRef, configuredRef],
			mcpServers: [],
		});
	});

	it('opens the inline configure step when Add is clicked', async () => {
		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const slack = getItems().find((item) => item.id === `nodeType:${SLACK.name}`);
		expect(slack).toBeDefined();
		emitConnect(slack!);
		await flushPromises();

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		expect(multiStepAttrs.step).toBe('configure');
		expect(getConfigData()).toMatchObject({
			toolRef: { type: 'node', node: { nodeType: SLACK.name } },
		});
	});

	it('uses the configure step for setup-less tools and commits on Save', async () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [WIKIPEDIA.name],
		};
		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const wikipedia = getItems().find((item) => item.id === `nodeType:${WIKIPEDIA.name}`);
		expect(wikipedia).toBeDefined();
		emitConnect(wikipedia!);
		await flushPromises();

		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		expect(onConfirm).not.toHaveBeenCalled();
		expect(getConfigData()).toMatchObject({
			toolRef: { type: 'node', name: 'Wikipedia' },
		});
		await saveConfiguration();

		expect(onConfirm).toHaveBeenCalledTimes(1);
		const [{ tools }] = onConfirm.mock.calls[0];
		expect(tools).toEqual([
			expect.objectContaining({
				type: 'node',
				name: 'Wikipedia',
				node: {
					nodeType: WIKIPEDIA.name,
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			}),
		]);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('adds another instance of a connected node tool instead of overwriting it', async () => {
		const existing = toolRef(SLACK.name);
		const onConfirm = vi.fn();
		render([existing], onConfirm);
		await flushPromises();

		const connected = getItems().find((item) => item.status === 'connected');
		emitConnect(connected!);

		// Activating a connected node-tool row opens configuration for a new
		// instance (fresh ref, empty parameters) — not an edit of the existing one.
		await flushPromises();
		const data = getConfigData();
		expect(data).toMatchObject({
			toolRef: {
				type: 'node',
				node: { nodeType: SLACK.name, nodeParameters: {} },
			},
		});
		expect(data.existingToolNames).toContain(existing.name);

		const configuredRef: AgentJsonToolRef = {
			type: 'node',
			name: 'Slack (1)',
			node: {
				nodeType: SLACK.name,
				nodeTypeVersion: 1,
				nodeParameters: { resource: 'message' },
				credentials: { slackApi: { id: 'c-2', name: 'Other Slack' } },
			},
		};
		await saveConfiguration(configuredRef);

		expect(onConfirm).toHaveBeenCalledWith({
			tools: [existing, configuredRef],
			mcpServers: [],
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('does not remove a connected node tool when activating its row', async () => {
		const existing = toolRef(SLACK.name);
		const onConfirm = vi.fn();
		render([existing], onConfirm);
		await flushPromises();

		const connected = getItems().find((item) => item.status === 'connected');
		emitConnect(connected!);

		// The connected row now opens config for a new instance; there is no
		// Remove callback on that flow. Removal happens through the capability pills.
		await flushPromises();
		expect(getConfigData().onRemove).toBeUndefined();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('appends a configured tool once the configure step saves', async () => {
		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const slack = getItems().find((item) => item.id === `nodeType:${SLACK.name}`);
		emitConnect(slack!);
		await flushPromises();

		const configuredRef: AgentJsonToolRef = {
			type: 'node',
			name: 'Slack',
			node: {
				nodeType: SLACK.name,
				nodeTypeVersion: 1,
				nodeParameters: { resource: 'message' },
				credentials: { slackApi: { id: 'c-1', name: 'Prod Slack' } },
			},
		};
		await saveConfiguration(configuredRef);

		expect(onConfirm).toHaveBeenCalledWith({
			tools: [configuredRef],
			mcpServers: [],
		});
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('uniquifies the name when the same setup-less tool is added twice', async () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [WIKIPEDIA.name],
		};
		const existing: AgentJsonToolRef = {
			type: 'node',
			name: 'Wikipedia',
			node: { nodeType: WIKIPEDIA.name, nodeTypeVersion: 1, nodeParameters: {} },
		};
		const onConfirm = vi.fn();
		render([existing], onConfirm);
		await flushPromises();

		emitConnect(getItems().find((item) => item.id === `nodeType:${WIKIPEDIA.name}`)!);
		await flushPromises();

		expect(getConfigData()).toMatchObject({
			toolRef: { type: 'node', name: 'Wikipedia (1)' },
		});
		await saveConfiguration();

		const [{ tools }] = onConfirm.mock.calls[0];
		expect(tools.map((tool: Extract<AgentJsonToolRef, { type: 'node' }>) => tool.name)).toEqual([
			'Wikipedia',
			'Wikipedia (1)',
		]);
	});

	describe('workflow tools', () => {
		const WORKFLOW = {
			id: 'wf-1',
			name: 'Daily sales digest',
			isArchived: false,
			nodes: [{ type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When called' }],
		};

		async function renderWithWorkflow(onConfirm = vi.fn()) {
			workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([WORKFLOW]);
			render([], onConfirm, [], PROJECT_ID, 'workflows');
			await flushPromises();
			return getItems().find((item) => item.id === `workflow:${WORKFLOW.id}`)!;
		}

		it('surfaces incompatible workflows as disabled items with a reason', async () => {
			workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([
				WORKFLOW,
				{
					id: 'wf-form',
					name: 'Has Form',
					isArchived: false,
					nodes: [
						{ type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When called' },
						{ type: 'n8n-nodes-base.form', name: 'Form' },
					],
				},
				{
					id: 'wf-no-trigger',
					name: 'No Trigger',
					isArchived: false,
					nodes: [{ type: 'n8n-nodes-base.set', name: 'Set' }],
				},
			]);
			render([], vi.fn(), [], PROJECT_ID, 'workflows');
			await flushPromises();

			const items = getItems();
			const compatible = items.find((i) => i.id === 'workflow:wf-1');
			const formDisabled = items.find((i) => i.id === 'workflow-disabled:wf-form');
			const noTriggerDisabled = items.find((i) => i.id === 'workflow-disabled:wf-no-trigger');

			// Compatible workflow remains selectable.
			expect(compatible?.disabled).toBeFalsy();

			// Incompatible workflows are visible but disabled, with a reason.
			expect(formDisabled).toBeTruthy();
			expect(formDisabled?.disabled).toBe(true);
			expect(formDisabled?.disabledReason).toContain("aren't supported as agent tools");

			expect(noTriggerDisabled).toBeTruthy();
			expect(noTriggerDisabled?.disabled).toBe(true);
			expect(noTriggerDisabled?.disabledReason).toContain(
				"Needs a 'When Executed by Another Workflow' trigger",
			);

			// Disabled items appear after compatible ones within the category.
			const workflowItems = items.filter((i) => i.kind === 'workflow');
			const compatibleIdx = workflowItems.findIndex((i) => i.id === 'workflow:wf-1');
			const formIdx = workflowItems.findIndex((i) => i.id === 'workflow-disabled:wf-form');
			const noTriggerIdx = workflowItems.findIndex(
				(i) => i.id === 'workflow-disabled:wf-no-trigger',
			);
			expect(compatibleIdx).toBeLessThan(formIdx);
			expect(compatibleIdx).toBeLessThan(noTriggerIdx);
		});

		it('creates a compatible workflow and attaches it after configuration is saved', async () => {
			const existingTool = toolRef(WIKIPEDIA.name);
			const onConfirm = vi.fn();
			workflowsStore.createNewWorkflow.mockResolvedValueOnce({
				...WORKFLOW,
				id: 'new-workflow-id',
				name: 'My workflow 1',
			} as unknown as IWorkflowDb);

			render([existingTool], onConfirm, [], PROJECT_ID, 'workflows');
			await flushPromises();

			emitCreateWorkflow();
			await flushPromises();

			expect(workflowsStore.createNewWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'My workflow 1',
					projectId: PROJECT_ID,
					nodes: expect.arrayContaining([
						expect.objectContaining({
							type: 'n8n-nodes-base.executeWorkflowTrigger',
						}),
					]),
				}),
			);
			expect(onConfirm).not.toHaveBeenCalled();
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			const data = getConfigData();
			expect(data).toMatchObject({
				projectId: PROJECT_ID,
				toolRef: {
					type: 'workflow',
					workflowId: 'new-workflow-id',
					workflow: 'My workflow 1',
					name: 'My workflow 1',
					description: '',
					allOutputs: false,
				},
			});
			if (data.kind === 'mcpServer' || data.toolRef.type !== 'workflow') {
				throw new Error('Expected a workflow tool');
			}

			const configuredRef: AgentJsonToolRef = {
				...data.toolRef,
				description: 'Create the daily sales digest',
			};
			await saveConfiguration(configuredRef);

			expect(onConfirm).toHaveBeenCalledWith({
				tools: [existingTool, configuredRef],
				mcpServers: [],
			});
			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
			expect(routerResolveMock).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: {
					workflowId: 'new-workflow-id',
					nodeId: SAMPLE_SUBWORKFLOW_TRIGGER_ID,
				},
			});
			expect(windowOpenMock).toHaveBeenCalledWith('/workflow/new-workflow-id', '_blank');
		});

		it('does not attach or open a workflow when creation fails', async () => {
			const error = new Error('network down');
			const onConfirm = vi.fn();
			workflowsStore.createNewWorkflow.mockRejectedValueOnce(error);

			render([], onConfirm, [], PROJECT_ID, 'workflows');
			await flushPromises();
			emitCreateWorkflow();
			await flushPromises();

			expect(onConfirm).not.toHaveBeenCalled();
			expect(windowOpenMock).not.toHaveBeenCalled();
			expect(showErrorMock).toHaveBeenCalledWith(error, expect.any(String), {
				message: expect.any(String),
			});
		});

		it('refuses a workflow whose body contains an incompatible node', async () => {
			const onConfirm = vi.fn();
			const workflow = await renderWithWorkflow(onConfirm);
			getWorkflowMock.mockResolvedValueOnce({
				...WORKFLOW,
				nodes: [
					{ type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When called' },
					{ type: 'n8n-nodes-base.form', name: 'Ask the user' },
				],
			} as unknown as IWorkflowDb);

			emitConnect(workflow);
			await flushPromises();

			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			expect(onConfirm).not.toHaveBeenCalled();
			expect(showErrorMock).toHaveBeenCalledTimes(1);
		});

		it('adds nothing when the compatibility pre-check fetch fails', async () => {
			const onConfirm = vi.fn();
			const workflow = await renderWithWorkflow(onConfirm);
			getWorkflowMock.mockRejectedValueOnce(new Error('network down'));

			emitConnect(workflow);
			await flushPromises();

			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			expect(onConfirm).not.toHaveBeenCalled();
			expect(showErrorMock).toHaveBeenCalledTimes(1);
		});
	});

	it('does not add a community tool when the install fails', async () => {
		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === COMMUNITY_INSTALLED.name) return COMMUNITY_INSTALLED;
			return null;
		});
		nodeTypesStore.communityNodeType = vi.fn().mockReturnValue({
			nodeDescription: COMMUNITY_PREVIEW,
			packageName: 'n8n-nodes-firecrawl',
			isOfficialNode: true,
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [COMMUNITY_PREVIEW.name],
		};
		installNodeMock.mockResolvedValue({ success: false });

		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		emitConnect(getItems().find((item) => item.id === `nodeType:${COMMUNITY_PREVIEW.name}`)!);
		await flushPromises();

		expect(installNodeMock).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('does not add a community tool when the installed node type cannot be resolved', async () => {
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);
		nodeTypesStore.communityNodeType = vi.fn().mockReturnValue({
			nodeDescription: COMMUNITY_PREVIEW,
			packageName: 'n8n-nodes-firecrawl',
			isOfficialNode: true,
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [COMMUNITY_PREVIEW.name],
		};

		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		emitConnect(getItems().find((item) => item.id === `nodeType:${COMMUNITY_PREVIEW.name}`)!);
		await flushPromises();

		expect(installNodeMock).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalledTimes(1);
	});

	describe('MCP servers', () => {
		const SERVER: AgentJsonMcpServerConfig = {
			name: 'github',
			url: 'https://mcp.example.com',
			transport: 'streamableHttp',
			authentication: 'none',
		};

		beforeEach(() => {
			nodeTypesStore.getNodeType = vi
				.fn()
				.mockImplementation((name: string) => (name === MCP_TOOL.name ? MCP_TOOL : null));
			nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
				[NodeConnectionTypes.AiTool]: [MCP_TOOL.name],
			};
		});

		it('commits an added MCP server to the host once its configure step saves', async () => {
			const onConfirm = vi.fn();
			render([], onConfirm);
			await flushPromises();

			emitConnect(getItems().find((item) => item.id === `nodeType:${MCP_TOOL.name}`)!);
			await flushPromises();

			expect(onConfirm).not.toHaveBeenCalled();
			expect(getConfigData().kind).toBe('mcpServer');

			await saveConfiguration(SERVER);

			expect(onConfirm).toHaveBeenCalledWith({ tools: [], mcpServers: [SERVER] });
			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		});

		it('removes a connected MCP server from its configure step', async () => {
			const onConfirm = vi.fn();
			render([], onConfirm, [SERVER]);
			await flushPromises();

			const connected = getItems().find((item) => item.id.startsWith('mcp:'));
			expect(connected?.title).toBe(SERVER.name);

			emitConnect(connected!);
			await flushPromises();
			expect(getConfigData().onRemove).toBeTypeOf('function');
			await removeConfiguration();

			expect(onConfirm).toHaveBeenCalledWith({ tools: [], mcpServers: [] });
		});
	});

	describe('n8n Connect section', () => {
		beforeEach(() => {
			// Only Slack is gateway-backed; Wikipedia stays a regular own-cred tool.
			settingsStore.isAiGatewayEnabled = true;
			aiGatewayStore.isNodeSupported = vi.fn((name: string) => name === SLACK.name);
			aiGatewayStore.isCredentialTypeSupported = vi.fn((type: string) => type === 'slackApi');
			nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
				[NodeConnectionTypes.AiTool]: [SLACK.name, WIKIPEDIA.name],
			};
		});

		it('keeps All first and default, with the n8n-connect tab right after it', async () => {
			render();
			await flushPromises();

			// "All" stays the default tab; n8n Connect slots in right after it.
			expect((modalAttrs.categories as string[]).slice(0, 2)).toEqual(['all', 'n8n-connect']);

			const gateway = getItems().find((item) => item.id === `n8n-connect:${SLACK.name}`);
			expect(gateway).toMatchObject({
				category: 'n8n-connect',
				freeCredits: true,
				status: 'none',
			});
			// The own-credential entry stays put so the manual flow is unaffected.
			expect(getItems().find((item) => item.id === `nodeType:${SLACK.name}`)).toBeDefined();
			// A tool the gateway does not back must not leak into the section.
			expect(
				getItems().find((item) => item.id === `n8n-connect:${WIKIPEDIA.name}`),
			).toBeUndefined();
		});

		it('hides the n8n-connect tab when the gateway is disabled', async () => {
			settingsStore.isAiGatewayEnabled = false;
			render();
			await flushPromises();

			expect(modalAttrs.categories as string[]).not.toContain('n8n-connect');
			expect(getItems().some((item) => item.id.startsWith('n8n-connect:'))).toBe(false);
		});

		it('hides the n8n-connect tab when no available tool is gateway-eligible', async () => {
			aiGatewayStore.isNodeSupported = vi.fn().mockReturnValue(false);
			render();
			await flushPromises();

			expect(modalAttrs.categories as string[]).not.toContain('n8n-connect');
		});

		it('opens the configure step with the managed credential pre-selected', async () => {
			const onConfirm = vi.fn();
			render([], onConfirm);
			await flushPromises();

			const gateway = getItems().find((item) => item.id === `n8n-connect:${SLACK.name}`);
			emitConnect(gateway!);
			await flushPromises();

			// Behaves like any other node tool. The configure step opens so the user
			// can pick the operation — only the credential is handled for them.
			expect(onConfirm).not.toHaveBeenCalled();
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();

			const data = getConfigData();
			if (data.kind === 'mcpServer' || data.toolRef.type !== 'node') {
				throw new Error('Expected a node tool');
			}
			expect(data.toolRef.node.credentials).toEqual({
				slackApi: { id: null, name: '', __aiGatewayManaged: true },
			});
		});

		it('commits the gateway tool once its configure step saves', async () => {
			const onConfirm = vi.fn();
			render([], onConfirm);
			await flushPromises();

			const gateway = getItems().find((item) => item.id === `n8n-connect:${SLACK.name}`);
			emitConnect(gateway!);
			await flushPromises();

			await saveConfiguration();

			expect(onConfirm).toHaveBeenCalledTimes(1);
			const [{ tools }] = onConfirm.mock.calls[0];
			expect(tools[0].node.credentials).toEqual({
				slackApi: { id: null, name: '', __aiGatewayManaged: true },
			});
			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		});

		it('adds another managed instance with the managed credential preselected', async () => {
			const existing: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: {
					nodeType: SLACK.name,
					nodeTypeVersion: 1,
					nodeParameters: {},
					credentials: { slackApi: { id: null, name: '', __aiGatewayManaged: true } },
				},
			};
			const onConfirm = vi.fn();
			render([existing], onConfirm);
			await flushPromises();

			const connected = getItems().find((item) => item.status === 'connected');
			emitConnect(connected!);
			await flushPromises();

			// Activating a connected managed tool routes through the managed add
			// path, so the new instance keeps the __aiGatewayManaged credential.
			const data = getConfigData();
			if (data.kind === 'mcpServer' || data.toolRef.type !== 'node') {
				throw new Error('Expected a node tool');
			}
			expect(data.toolRef.node.credentials).toEqual({
				slackApi: { id: null, name: '', __aiGatewayManaged: true },
			});
			expect(data.existingToolNames).toContain(existing.name);
		});
	});

	describe('restricted node types', () => {
		function restrictedSlackItem() {
			const item = getItems().find((candidate) => candidate.id === `nodeType:${SLACK.name}`);
			if (!item) throw new Error('Missing Slack item');
			return item;
		}

		it('loads the policy for the agent project on mount', async () => {
			const fetchForProject = vi
				.spyOn(useTypeAvailabilityPoliciesStore(), 'fetchForProject')
				.mockResolvedValue(undefined);

			render([], vi.fn(), [], PROJECT_ID);
			await flushPromises();

			expect(fetchForProject).toHaveBeenCalledWith(PROJECT_ID);
		});

		it('flags a restricted tool so the modal can lock it and list it last', async () => {
			mockRestrictedNodeTypes({ [SLACK.name]: 'instance' });

			render();
			await flushPromises();

			// The wrapper marks; ToolsConnectionModal owns the order and the row treatment.
			expect(restrictedSlackItem()).toMatchObject({
				restriction: { available: false, scope: 'instance' },
			});
			const wikipedia = getItems().find((item) => item.id === `nodeType:${WIKIPEDIA.name}`);
			expect(wikipedia).toBeDefined();
			expect('restriction' in wikipedia! && wikipedia.restriction).toBeFalsy();
		});

		it('adds nothing when a restricted tool is activated', async () => {
			mockRestrictedNodeTypes({ [SLACK.name]: 'instance' });
			const onConfirm = vi.fn();

			render([], onConfirm);
			await flushPromises();

			emitConnect(restrictedSlackItem());
			emitOpenDetail(restrictedSlackItem());
			await flushPromises();

			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
			expect(onConfirm).not.toHaveBeenCalled();
		});

		it('leaves the list untouched when nothing is restricted', async () => {
			mockRestrictedNodeTypes();

			render();
			await flushPromises();

			const nodeItems = getItems().filter((item) => item.id.startsWith('nodeType:'));
			expect(nodeItems.map((item) => item.id)).toEqual([
				`nodeType:${SLACK.name}`,
				`nodeType:${WIKIPEDIA.name}`,
			]);
			expect(nodeItems.every((item) => !('restriction' in item && item.restriction))).toBe(true);
		});
	});
});
