import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useActions } from './useActions';
import {
	AGENT_NODE_TYPE,
	AI_CATEGORY_LANGUAGE_MODELS,
	BASIC_CHAIN_NODE_TYPE,
	GITHUB_TRIGGER_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MESSAGE_AN_AGENT_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
	NO_OP_NODE_TYPE,
	OPEN_AI_CHAT_MODEL_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	SLACK_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
	WEBHOOK_NODE_TYPE,
} from '@/app/constants';
import {
	CHAIN_LLM_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	type INodeTypeDescription,
} from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

const mockTriggerNodeType = (type: string): Record<number, INodeTypeDescription> => ({
	1: {
		name: type,
		displayName: type,
		group: ['trigger'],
		version: 1,
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		description: '',
	},
});

const mockLanguageModelNodeType = (type: string): Record<number, INodeTypeDescription> => ({
	1: {
		name: type,
		displayName: type,
		group: ['transform'],
		version: 1,
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		description: '',
		codex: { subcategories: { [AI_CATEGORY_LANGUAGE_MODELS]: [type] } },
	},
});

const mockDocumentStoreState = vi.hoisted(() => ({
	allNodes: [] as INodeUi[],
	workflowTriggerNodes: [] as INodeUi[],
	aiNodes: [] as INodeUi[],
	name: '',
	settings: {},
	getPinDataSnapshot: () => ({}),
	getNodeById: (_id: string) => undefined as INodeUi | undefined,
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStoreState,
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
	injectWorkflowDocumentStore: () => ({ value: mockDocumentStoreState }),
}));

describe('useActions', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockDocumentStoreState.allNodes = [];
		mockDocumentStoreState.getNodeById = () => undefined;
		useUIStore().lastInteractedWithNodeId = undefined;
		useNodeCreatorStore().openingContext = null;
	});

	describe('getAddedNodesAndConnections', () => {
		test('should insert a manual trigger node when there are no triggers', () => {
			const nodeCreatorStore = useNodeCreatorStore();

			mockDocumentStoreState.workflowTriggerNodes = [];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: HTTP_REQUEST_NODE_TYPE }])).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: MANUAL_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should not insert a manual trigger node when there is a trigger in the workflow', () => {
			const nodeCreatorStore = useNodeCreatorStore();

			mockDocumentStoreState.workflowTriggerNodes = [{ type: SCHEDULE_TRIGGER_NODE_TYPE } as never];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: HTTP_REQUEST_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true }],
			});
		});

		test('should insert a ChatTrigger node when an AI Agent is added on an empty canvas', () => {
			mockDocumentStoreState.workflowTriggerNodes = [];
			mockDocumentStoreState.allNodes = [];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: {
							nodeIndex: 0,
						},
						to: {
							nodeIndex: 1,
						},
					},
				],
				nodes: [
					{ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: AGENT_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should insert a ChatTrigger node when an AI Agent is added with only a Manual Trigger present', () => {
			mockDocumentStoreState.workflowTriggerNodes = [{ type: MANUAL_TRIGGER_NODE_TYPE } as never];
			mockDocumentStoreState.allNodes = [{ type: MANUAL_TRIGGER_NODE_TYPE } as INodeUi];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: {
							nodeIndex: 0,
						},
						to: {
							nodeIndex: 1,
						},
					},
				],
				nodes: [
					{ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: AGENT_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should NOT insert a ChatTrigger node when connecting a compatible chat node directly to an existing Manual Trigger', () => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[MANUAL_TRIGGER_NODE_TYPE]: mockTriggerNodeType(MANUAL_TRIGGER_NODE_TYPE),
			};

			const existingTriggerNode = {
				id: '1',
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
			} as INodeUi;
			mockDocumentStoreState.workflowTriggerNodes = [existingTriggerNode];
			mockDocumentStoreState.allNodes = [existingTriggerNode];
			mockDocumentStoreState.getNodeById = (id) =>
				id === existingTriggerNode.id ? existingTriggerNode : undefined;
			useUIStore().lastInteractedWithNodeId = existingTriggerNode.id;

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: BASIC_CHAIN_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: BASIC_CHAIN_NODE_TYPE, openDetail: true }],
			});
		});

		test('should still prepend a Chat Trigger and Chain LLM wrapper when a language model is added directly to an existing Manual Trigger', () => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[MANUAL_TRIGGER_NODE_TYPE]: mockTriggerNodeType(MANUAL_TRIGGER_NODE_TYPE),
				[OPEN_AI_CHAT_MODEL_NODE_TYPE]: mockLanguageModelNodeType(OPEN_AI_CHAT_MODEL_NODE_TYPE),
			};

			const existingTriggerNode = {
				id: '1',
				name: 'Manual Trigger',
				type: MANUAL_TRIGGER_NODE_TYPE,
			} as INodeUi;
			mockDocumentStoreState.workflowTriggerNodes = [existingTriggerNode];
			mockDocumentStoreState.allNodes = [existingTriggerNode];
			mockDocumentStoreState.aiNodes = [];
			mockDocumentStoreState.getNodeById = (id) =>
				id === existingTriggerNode.id ? existingTriggerNode : undefined;
			useUIStore().lastInteractedWithNodeId = existingTriggerNode.id;

			const { getAddedNodesAndConnections } = useActions();

			// A language model node has no Main input, so the auto-connect from
			// the existing trigger would silently fail - it always needs its own
			// Chat Trigger + Chain LLM wrapper, even when opened from a trigger.
			expect(getAddedNodesAndConnections([{ type: OPEN_AI_CHAT_MODEL_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: { nodeIndex: 2, type: NodeConnectionTypes.AiLanguageModel },
						to: { nodeIndex: 1 },
					},
					{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } },
				],
				nodes: [
					{ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: CHAIN_LLM_LANGCHAIN_NODE_TYPE, isAutoAdd: true },
					{ type: OPEN_AI_CHAT_MODEL_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should not insert a ChatTrigger node when an AI Agent is added with a non-trigger node prseent', () => {
			mockDocumentStoreState.workflowTriggerNodes = [{ type: GITHUB_TRIGGER_NODE_TYPE } as never];
			mockDocumentStoreState.allNodes = [
				{ type: GITHUB_TRIGGER_NODE_TYPE } as INodeUi,
				{ type: HTTP_REQUEST_NODE_TYPE } as INodeUi,
			];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: AGENT_NODE_TYPE, openDetail: true }],
			});
		});

		test('should not insert a ChatTrigger node when an AI Agent is added with a Chat Trigger already present', () => {
			mockDocumentStoreState.workflowTriggerNodes = [{ type: CHAT_TRIGGER_NODE_TYPE } as never];
			mockDocumentStoreState.allNodes = [{ type: CHAT_TRIGGER_NODE_TYPE } as INodeUi];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: AGENT_NODE_TYPE, openDetail: true }],
			});
		});

		test('should insert a ChatTrigger node when a Message an Agent node is added on an empty canvas', () => {
			mockDocumentStoreState.workflowTriggerNodes = [];
			mockDocumentStoreState.allNodes = [];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: MESSAGE_AN_AGENT_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: {
							nodeIndex: 0,
						},
						to: {
							nodeIndex: 1,
						},
					},
				],
				nodes: [
					{ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: MESSAGE_AN_AGENT_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should not insert a ChatTrigger node when a Message an Agent node is added with a non-trigger node present', () => {
			mockDocumentStoreState.workflowTriggerNodes = [{ type: GITHUB_TRIGGER_NODE_TYPE } as never];
			mockDocumentStoreState.allNodes = [
				{ type: GITHUB_TRIGGER_NODE_TYPE } as INodeUi,
				{ type: HTTP_REQUEST_NODE_TYPE } as INodeUi,
			];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: MESSAGE_AN_AGENT_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: MESSAGE_AN_AGENT_NODE_TYPE, openDetail: true }],
			});
		});

		test('should insert a No Op node when a Loop Over Items Node is added', () => {
			const nodeCreatorStore = useNodeCreatorStore();

			mockDocumentStoreState.workflowTriggerNodes = [];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: SPLIT_IN_BATCHES_NODE_TYPE }])).toEqual({
				connections: [
					{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } },
					{ from: { nodeIndex: 1, outputIndex: 1 }, to: { nodeIndex: 2 } },
					{ from: { nodeIndex: 2 }, to: { nodeIndex: 1 } },
				],
				nodes: [
					{ isAutoAdd: true, type: MANUAL_TRIGGER_NODE_TYPE },
					{ openDetail: true, type: SPLIT_IN_BATCHES_NODE_TYPE },
					{
						isAutoAdd: true,
						name: 'Replace Me',
						type: NO_OP_NODE_TYPE,
						placeholder: true,
						positionOffset: [0, 208],
					},
				],
			});
		});

		test('should connect node to schedule trigger when adding them together', () => {
			const nodeCreatorStore = useNodeCreatorStore();
			const nodeTypesStore = useNodeTypesStore();

			mockDocumentStoreState.workflowTriggerNodes = [{ type: SCHEDULE_TRIGGER_NODE_TYPE } as never];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);
			nodeTypesStore.nodeTypes = {
				[SCHEDULE_TRIGGER_NODE_TYPE]: {
					1: {
						name: SCHEDULE_TRIGGER_NODE_TYPE,
						displayName: 'Schedule Trigger',
						group: ['trigger'],
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
						description: '',
					},
				},
			};
			const { getAddedNodesAndConnections } = useActions();

			expect(
				getAddedNodesAndConnections([
					{ type: SCHEDULE_TRIGGER_NODE_TYPE, openDetail: true },
					{ type: SLACK_NODE_TYPE },
				]),
			).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [{ type: SCHEDULE_TRIGGER_NODE_TYPE, openDetail: true }, { type: SLACK_NODE_TYPE }],
			});
		});

		test('should connect node to webhook trigger when adding them together', () => {
			const nodeCreatorStore = useNodeCreatorStore();
			const nodeTypesStore = useNodeTypesStore();

			mockDocumentStoreState.workflowTriggerNodes = [{ type: SCHEDULE_TRIGGER_NODE_TYPE } as never];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);
			nodeTypesStore.nodeTypes = {
				[WEBHOOK_NODE_TYPE]: {
					1: {
						name: WEBHOOK_NODE_TYPE,
						displayName: 'Webhook',
						group: ['trigger'],
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
						description: '',
					},
				},
			};
			const { getAddedNodesAndConnections } = useActions();

			expect(
				getAddedNodesAndConnections([
					{ type: WEBHOOK_NODE_TYPE, openDetail: true },
					{ type: SLACK_NODE_TYPE },
				]),
			).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [{ type: WEBHOOK_NODE_TYPE, openDetail: true }, { type: SLACK_NODE_TYPE }],
			});
		});
	});

	describe('getConnectionTriggerNode', () => {
		test('should return undefined when the node creator was not opened by connecting to a node', () => {
			useUIStore().lastInteractedWithNodeId = undefined;

			const { getConnectionTriggerNode } = useActions();

			expect(getConnectionTriggerNode()).toBeUndefined();
		});

		test('should return the node the node creator was opened from when it is a trigger', () => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[MANUAL_TRIGGER_NODE_TYPE]: mockTriggerNodeType(MANUAL_TRIGGER_NODE_TYPE),
			};

			const node = { id: '1', name: 'Manual Trigger', type: MANUAL_TRIGGER_NODE_TYPE } as INodeUi;
			mockDocumentStoreState.getNodeById = (id: string) => (id === node.id ? node : undefined);
			useUIStore().lastInteractedWithNodeId = node.id;

			const { getConnectionTriggerNode } = useActions();

			expect(getConnectionTriggerNode()).toBe(node);
		});

		test('should return undefined when the last interacted node is not a trigger', () => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[HTTP_REQUEST_NODE_TYPE]: {
					1: {
						name: HTTP_REQUEST_NODE_TYPE,
						displayName: 'HTTP Request',
						group: ['transform'],
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
						description: '',
					},
				},
			};

			const node = { id: '1', name: 'HTTP Request', type: HTTP_REQUEST_NODE_TYPE } as INodeUi;
			mockDocumentStoreState.getNodeById = (id: string) => (id === node.id ? node : undefined);
			useUIStore().lastInteractedWithNodeId = node.id;

			const { getConnectionTriggerNode } = useActions();

			expect(getConnectionTriggerNode()).toBeUndefined();
		});

		test('should return undefined while a node replacement is in progress', () => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[MANUAL_TRIGGER_NODE_TYPE]: mockTriggerNodeType(MANUAL_TRIGGER_NODE_TYPE),
			};

			const node = { id: '1', name: 'Manual Trigger', type: MANUAL_TRIGGER_NODE_TYPE } as INodeUi;
			mockDocumentStoreState.getNodeById = (id: string) => (id === node.id ? node : undefined);
			useUIStore().lastInteractedWithNodeId = node.id;
			useNodeCreatorStore().openingContext = 'replacement';

			const { getConnectionTriggerNode } = useActions();

			expect(getConnectionTriggerNode()).toBeUndefined();
		});
	});

	describe('actionDataToNodeTypeSelectedPayload', () => {
		test('should include actionName from ActionData', () => {
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const actionData = {
				name: 'Create Contact',
				key: 'hubspot',
				value: {
					resource: 'contact',
					operation: 'create',
				},
			};

			const result = actionDataToNodeTypeSelectedPayload(actionData);

			expect(result).toEqual({
				type: 'hubspot',
				actionName: 'Create Contact',
				parameters: {
					resource: 'contact',
					operation: 'create',
				},
			});
		});

		test('should include actionName even when parameters are undefined', () => {
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const actionData = {
				name: 'Send Message',
				key: 'slack',
				value: {},
			};

			const result = actionDataToNodeTypeSelectedPayload(actionData);

			expect(result).toEqual({
				type: 'slack',
				actionName: 'Send Message',
			});
		});

		test('should preserve existing resource and operation alongside actionName', () => {
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const actionData = {
				name: 'Update Record',
				key: 'airtable',
				value: {
					resource: 'base',
					operation: 'update',
					someOtherParam: 'value',
				},
			};

			const result = actionDataToNodeTypeSelectedPayload(actionData);

			expect(result).toEqual({
				type: 'airtable',
				actionName: 'Update Record',
				parameters: {
					resource: 'base',
					operation: 'update',
				},
			});
		});
	});

	describe('getAddedNodesAndConnections with actionName', () => {
		test('should preserve actionName in nodes array', () => {
			const nodeCreatorStore = useNodeCreatorStore();

			mockDocumentStoreState.workflowTriggerNodes = [];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			const result = getAddedNodesAndConnections([
				{ type: HTTP_REQUEST_NODE_TYPE, actionName: 'Make API Call' },
			]);

			expect(result).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: MANUAL_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true, actionName: 'Make API Call' },
				],
			});
		});

		test('should preserve actionName when no trigger is prepended', () => {
			const nodeCreatorStore = useNodeCreatorStore();

			mockDocumentStoreState.workflowTriggerNodes = [{ type: MANUAL_TRIGGER_NODE_TYPE } as never];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			const result = getAddedNodesAndConnections([
				{ type: SLACK_NODE_TYPE, actionName: 'Post Message' },
			]);

			expect(result).toEqual({
				connections: [],
				nodes: [{ type: SLACK_NODE_TYPE, openDetail: true, actionName: 'Post Message' }],
			});
		});

		test('should work with multiple nodes having actionNames', () => {
			const nodeCreatorStore = useNodeCreatorStore();
			const nodeTypesStore = useNodeTypesStore();

			mockDocumentStoreState.workflowTriggerNodes = [{ type: MANUAL_TRIGGER_NODE_TYPE } as never];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			nodeTypesStore.nodeTypes = {
				[WEBHOOK_NODE_TYPE]: mockTriggerNodeType(WEBHOOK_NODE_TYPE),
			};

			const { getAddedNodesAndConnections } = useActions();

			const result = getAddedNodesAndConnections([
				{ type: WEBHOOK_NODE_TYPE, openDetail: true, actionName: 'Receive Webhook' },
				{ type: SLACK_NODE_TYPE, actionName: 'Send Notification' },
			]);

			expect(result).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: WEBHOOK_NODE_TYPE, openDetail: true, actionName: 'Receive Webhook' },
					{ type: SLACK_NODE_TYPE, actionName: 'Send Notification' },
				],
			});
		});
	});
});
