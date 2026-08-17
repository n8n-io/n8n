import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { getWorkflow } from '@/app/api/workflows';
import { VIEWS } from '@/app/constants';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { SAMPLE_SUBWORKFLOW_TRIGGER_ID } from '@/app/constants/samples';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { ToolConnectionItem } from '@/features/shared/toolsConnection/types';
import type { IWorkflowDb } from '@/Interface';

import AgentToolsConnectionModalWrapper from '../components/AgentToolsConnectionModalWrapper.vue';
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

const ToolsConnectionModalStub = defineComponent({
	name: 'ToolsConnectionModal',
	inheritAttrs: false,
	setup(_, { attrs }) {
		modalAttrs = attrs;
		return {};
	},
	template: '<div data-test-id="tools-connection-modal-stub" />',
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
	const listener = modalAttrs.onCreateWorkflow;
	if (typeof listener !== 'function') throw new Error('Missing onCreateWorkflow');
	(listener as () => void)();
}

const MODAL_NAME = 'agentToolsModal';
const PROJECT_ID = 'project-1';

const renderComponent = createComponentRenderer(AgentToolsConnectionModalWrapper, {
	global: {
		stubs: {
			ToolsConnectionModal: ToolsConnectionModalStub,
		},
	},
});

describe('AgentToolsConnectionModalWrapper', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let windowOpenMock: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		uuidMockState.counter = 0;
		modalAttrs = {};
		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		uiStore = mockedStore(useUIStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);
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
	) {
		return renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { tools, mcpServers, onConfirm, projectId },
			},
		});
	}

	// DynamicModalLoader passes `open`/`active`/`mode`/`activeId` on top of the
	// declared props. If those fall through onto ToolsConnectionModal the
	// inherited `open` is always true while mounted and would pin the dialog
	// open, so mount the way the loader does and drive it from the store.
	it('drives the dialog from the store, not the inherited loader attrs', async () => {
		renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { tools: [], onConfirm: vi.fn() },
			},
			attrs: { open: true, active: true, mode: '', activeId: '' },
		});
		await flushPromises();
		expect(modalAttrs.open).toBe(true);

		uiStore.modalStateById[MODAL_NAME].open = false;
		await flushPromises();
		expect(modalAttrs.open).toBe(false);
	});

	// The two dialogs are sequential, not stacked: this one steps aside for the
	// config modal, then comes back when it closes, so cancelling returns to the
	// list rather than dead-ending.
	it('steps aside while the tool config modal is up, then returns', async () => {
		render();
		await flushPromises();
		expect(modalAttrs.open).toBe(true);

		uiStore.modalStateById.agentToolConfigModal.open = true;
		await flushPromises();
		expect(modalAttrs.open).toBe(false);

		uiStore.modalStateById.agentToolConfigModal.open = false;
		await flushPromises();
		expect(modalAttrs.open).toBe(true);
	});

	it('assigns each available item the category tab it belongs to', async () => {
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
		expect(categoryById.get('nodeType:n8n-nodes-base.gmail')).toBe('n8n');
	});

	it('assigns workflows to the workflows category', async () => {
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([
			{
				id: 'wf-1',
				name: 'Onboarding',
				isArchived: false,
				nodes: [{ type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When called' }],
			},
		]);

		render();
		await flushPromises();

		const workflow = getItems().find((item) => item.id === 'workflow:wf-1');
		expect(workflow?.category).toBe('workflows');
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
		const connected = items.filter((item) => item.isConnected);
		const availableSlack = items.filter(
			(item) => !item.isConnected && item.kind === 'node' && item.id === `nodeType:${SLACK.name}`,
		);

		expect(connected).toHaveLength(1);
		expect(connected[0].id).toMatch(/^tool:/);
		expect(connected[0].title).toBe(SLACK.name);
		expect(availableSlack).toHaveLength(1);
	});

	it('opens the config modal when Connect is clicked on a node that needs setup', async () => {
		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const slack = getItems().find((item) => item.id === `nodeType:${SLACK.name}`);
		expect(slack).toBeDefined();
		emitConnect(slack!);

		expect(onConfirm).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(payload.name).toBe('agentToolConfigModal');
		expect(payload.data.toolRef).toMatchObject({
			type: 'node',
			node: { nodeType: SLACK.name },
		});
	});

	it('adds setup-less tools directly and commits them via onConfirm', async () => {
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [WIKIPEDIA.name],
		};
		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const wikipedia = getItems().find((item) => item.id === `nodeType:${WIKIPEDIA.name}`);
		expect(wikipedia).toBeDefined();
		emitConnect(wikipedia!);

		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
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

	it('closes the tools modal once an edit to a connected tool is saved', async () => {
		const onConfirm = vi.fn();
		render([toolRef(SLACK.name)], onConfirm);
		await flushPromises();

		const connected = getItems().find((item) => item.isConnected);
		emitConnect(connected!);

		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		payload.data.onConfirm({ ...toolRef(SLACK.name), name: 'Renamed Slack' });

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});

	it('removes a connected tool when the config modal asks to', async () => {
		const onConfirm = vi.fn();
		render([toolRef(SLACK.name)], onConfirm);
		await flushPromises();

		const connected = getItems().find((item) => item.isConnected);
		emitConnect(connected!);

		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
		payload.data.onRemove();

		expect(onConfirm).toHaveBeenCalledWith({ tools: [], mcpServers: [] });
	});

	it('appends a configured tool once the config modal saves', async () => {
		const onConfirm = vi.fn();
		render([], onConfirm);
		await flushPromises();

		const slack = getItems().find((item) => item.id === `nodeType:${SLACK.name}`);
		emitConnect(slack!);

		const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
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
		payload.data.onConfirm(configuredRef);

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
			render([], onConfirm);
			await flushPromises();
			return getItems().find((item) => item.id === `workflow:${WORKFLOW.id}`)!;
		}

		it('creates a compatible workflow and attaches it after configuration is saved', async () => {
			const existingTool = toolRef(WIKIPEDIA.name);
			const onConfirm = vi.fn();
			workflowsStore.createNewWorkflow.mockResolvedValueOnce({
				...WORKFLOW,
				id: 'new-workflow-id',
				name: 'My workflow 1',
			} as unknown as IWorkflowDb);

			render([existingTool], onConfirm, [], PROJECT_ID);
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
			const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(payload).toMatchObject({
				name: 'agentToolConfigModal',
				data: {
					projectId: PROJECT_ID,
					toolRef: {
						type: 'workflow',
						workflowId: 'new-workflow-id',
						workflow: 'My workflow 1',
						name: 'My workflow 1',
						description: '',
						allOutputs: false,
					},
				},
			});

			const configuredRef: AgentJsonToolRef = {
				...payload.data.toolRef,
				description: 'Create the daily sales digest',
			};
			payload.data.onConfirm(configuredRef);

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

			render([], onConfirm, [], PROJECT_ID);
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
					{ type: 'n8n-nodes-base.wait', name: 'Wait a bit' },
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

		it('commits an added MCP server to the host once its config modal saves', async () => {
			const onConfirm = vi.fn();
			render([], onConfirm);
			await flushPromises();

			emitConnect(getItems().find((item) => item.id === `nodeType:${MCP_TOOL.name}`)!);

			expect(onConfirm).not.toHaveBeenCalled();
			const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(payload.data.kind).toBe('mcpServer');

			payload.data.onConfirm(SERVER);

			expect(onConfirm).toHaveBeenCalledWith({ tools: [], mcpServers: [SERVER] });
			expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
		});

		it('removes a connected MCP server when its config modal asks to', async () => {
			const onConfirm = vi.fn();
			render([], onConfirm, [SERVER]);
			await flushPromises();

			const connected = getItems().find((item) => item.id.startsWith('mcp:'));
			expect(connected?.title).toBe(SERVER.name);

			emitConnect(connected!);
			const [payload] = (uiStore.openModalWithData as ReturnType<typeof vi.fn>).mock.calls[0];
			payload.data.onRemove();

			expect(onConfirm).toHaveBeenCalledWith({ tools: [], mcpServers: [] });
		});
	});
});
