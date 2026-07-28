import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { ToolConnectionItem } from '@/features/shared/toolsConnection/types';

import AgentToolsConnectionModalWrapper from '../components/AgentToolsConnectionModalWrapper.vue';
import type { AgentJsonToolRef } from '../types';

const showMessageMock = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
		showMessage: showMessageMock,
		showToast: vi.fn(),
	}),
}));

vi.mock('@/app/api/workflows', () => ({
	getWorkflow: vi.fn(),
}));

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

const MODAL_NAME = 'agentToolsModal';

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

	beforeEach(() => {
		vi.clearAllMocks();
		uuidMockState.counter = 0;
		modalAttrs = {};
		createTestingPinia({ stubActions: false });

		nodeTypesStore = mockedStore(useNodeTypesStore);
		uiStore = mockedStore(useUIStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		nodeTypesStore.getNodeType = vi.fn().mockImplementation((name: string) => {
			if (name === SLACK.name) return SLACK;
			if (name === WIKIPEDIA.name) return WIKIPEDIA;
			return null;
		});
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames = {
			[NodeConnectionTypes.AiTool]: [SLACK.name, WIKIPEDIA.name],
		};
		workflowsListStore.searchWorkflows = vi.fn().mockResolvedValue([]);

		uiStore.modalsById = {
			[MODAL_NAME]: { open: true, data: {} },
			agentToolConfigModal: { open: false },
		};
		uiStore.closeModal = vi.fn();
		uiStore.openModalWithData = vi.fn();
		showMessageMock.mockReset();
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

	function render(tools: AgentJsonToolRef[] = [], onConfirm = vi.fn()) {
		return renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { tools, onConfirm },
			},
		});
	}

	// DynamicModalLoader passes `open`/`active`/`mode`/`activeId` on top of the
	// declared props. If those fall through onto ToolsConnectionModal the
	// inherited `open` pins the dialog open and the config modal renders behind
	// it, so mount the way the loader does.
	it('hides the shared dialog while the config modal is open, ignoring inherited attrs', async () => {
		renderComponent({
			props: {
				modalName: MODAL_NAME,
				data: { tools: [], onConfirm: vi.fn() },
			},
			attrs: { open: true, active: true, mode: '', activeId: '' },
		});
		await flushPromises();
		expect(modalAttrs.open).toBe(true);

		uiStore.modalsById.agentToolConfigModal.open = true;
		await flushPromises();
		expect(modalAttrs.open).toBe(false);

		uiStore.modalsById.agentToolConfigModal.open = false;
		await flushPromises();
		expect(modalAttrs.open).toBe(true);
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
});
