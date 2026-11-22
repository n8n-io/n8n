import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useActions } from './useActions';
import { mockRestrictedNodeTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
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
import type { ActionTypeDescription, INodeUi } from '@/Interface';
import { useSettingsStore } from '@n8n/stores/settings.store';

const customActionSelection = vi.hoisted(() => ({
	pinValuesFor: vi.fn(),
	newestPinValuesFor: vi.fn(),
	actionNameFor: vi.fn(),
	preload: vi.fn(),
	whenLoaded: vi.fn(async () => {}),
}));
vi.mock('@n8n/frontend-module-custom-nodes', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useCustomActionSelection: () => customActionSelection,
}));

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
		vi.mocked(useNodeTypesStore().isNodeTypeUnavailable).mockReset();
		mockDocumentStoreState.allNodes = [];
		mockDocumentStoreState.getNodeById = () => undefined;
		useUIStore().lastInteractedWithNodeId = undefined;
		useNodeCreatorStore().openingContext = null;
	});

	describe('getAddedNodesAndConnections', () => {
		it('adds nothing when any requested type is restricted', () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.gmail': 'instance' });
			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: 'n8n-nodes-base.gmail' }])).toEqual({
				nodes: [],
				connections: [],
			});
		});

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

		test.each([
			NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
			NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
			NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
		])('should not insert a manual trigger when opened from %s', (openSource) => {
			const nodeCreatorStore = useNodeCreatorStore();

			mockDocumentStoreState.workflowTriggerNodes = [];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(openSource);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: HTTP_REQUEST_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true }],
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

		test('should fall back to a manual trigger when the Chat Trigger type is not loaded', () => {
			const nodeCreatorStore = useNodeCreatorStore();
			mockDocumentStoreState.workflowTriggerNodes = [];
			mockDocumentStoreState.allNodes = [];
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);
			vi.mocked(useNodeTypesStore().isNodeTypeUnavailable).mockImplementation(
				(type) => type === CHAT_TRIGGER_NODE_TYPE,
			);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: MANUAL_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: AGENT_NODE_TYPE, openDetail: true },
				],
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

		test('should skip an auto-added node whose type is not loaded and keep the other connections', () => {
			const nodeTypesStore = useNodeTypesStore();
			nodeTypesStore.nodeTypes = {
				[OPEN_AI_CHAT_MODEL_NODE_TYPE]: mockLanguageModelNodeType(OPEN_AI_CHAT_MODEL_NODE_TYPE),
			};
			vi.mocked(nodeTypesStore.isNodeTypeUnavailable).mockImplementation(
				(type) => type === CHAT_TRIGGER_NODE_TYPE,
			);
			mockDocumentStoreState.aiNodes = [];

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: OPEN_AI_CHAT_MODEL_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: { nodeIndex: 1, type: NodeConnectionTypes.AiLanguageModel },
						to: { nodeIndex: 0 },
					},
				],
				nodes: [
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

	describe('custom action pin values', () => {
		const customPins = {
			resource: '__CUSTOM_ACTION__',
			operation: 'action-1@2',
			customActionId: 'action-1',
			customActionName: 'Archive channel',
		};
		const actionItem = (operation: string, resource: string) =>
			({
				name: SLACK_NODE_TYPE,
				displayName: 'An action',
				actionKey: operation,
				values: { operation },
				displayOptions: { show: { resource: [resource] } },
			}) as unknown as ActionTypeDescription;

		const setModuleActive = (active: boolean) => {
			vi.mocked(useSettingsStore().isModuleActive).mockReturnValue(active);
		};

		beforeEach(() => {
			customActionSelection.pinValuesFor.mockImplementation(
				(_type: string, parameters: { operation?: string }) =>
					parameters.operation === customPins.operation ? { ...customPins } : undefined,
			);
		});

		test('getActionData adds the id and the name of a custom action', () => {
			setModuleActive(true);
			const { getActionData } = useActions();

			const data = getActionData(actionItem('action-1@2', '__CUSTOM_ACTION__'));

			expect(customActionSelection.pinValuesFor).toHaveBeenCalledWith(SLACK_NODE_TYPE, {
				operation: 'action-1@2',
				resource: '__CUSTOM_ACTION__',
			});
			expect(data.value).toEqual(customPins);
		});

		test('getActionData does not change a built-in action', () => {
			setModuleActive(true);
			const { getActionData } = useActions();

			expect(getActionData(actionItem('archive', 'channel'))).toEqual({
				name: 'An action',
				key: SLACK_NODE_TYPE,
				value: { operation: 'archive', resource: 'channel' },
			});
		});

		test('actionDataToNodeTypeSelectedPayload writes all pin values of a custom action', () => {
			setModuleActive(true);
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const result = actionDataToNodeTypeSelectedPayload({
				name: 'Archive channel',
				key: SLACK_NODE_TYPE,
				value: { operation: 'action-1@2', resource: '__CUSTOM_ACTION__' },
			});

			expect(result).toEqual({
				type: SLACK_NODE_TYPE,
				actionName: 'Archive channel',
				parameters: customPins,
			});
		});

		describe('first selection before the custom actions are loaded', () => {
			const addedNode = {
				id: 'node-1',
				name: 'Slack',
				type: SLACK_NODE_TYPE,
				parameters: { operation: 'action-1@2', resource: '__CUSTOM_ACTION__' },
			} as unknown as INodeUi;
			let addNode: (node: INodeUi) => void;
			const setNodeParameters = vi.fn();

			beforeEach(() => {
				let loaded = false;
				customActionSelection.pinValuesFor.mockImplementation(
					(_type: string, parameters: { operation?: string }) =>
						loaded && parameters.operation === customPins.operation ? { ...customPins } : undefined,
				);
				customActionSelection.whenLoaded.mockImplementation(async () => {
					loaded = true;
				});
				Object.assign(mockDocumentStoreState, {
					onNodesChange: (handler: (event: unknown) => void) => {
						addNode = (node) => handler({ action: 'add', payload: { node } });
						return { off: vi.fn() };
					},
					setLastNodeParameters: vi.fn(),
					setNodeParameters,
					getNodeById: () => addedNode,
				});
			});

			test('writes all pin values after the load, with no earlier lookup', async () => {
				setModuleActive(true);
				const { setAddedNodeActionParameters } = useActions();

				setAddedNodeActionParameters({
					name: 'Archive channel',
					key: SLACK_NODE_TYPE,
					value: { operation: 'action-1@2', resource: '__CUSTOM_ACTION__' },
				});
				addNode(addedNode);
				await vi.waitFor(() => expect(setNodeParameters).toHaveBeenCalled());

				expect(setNodeParameters).toHaveBeenCalledWith({ name: 'Slack', value: customPins }, true);
			});

			test('writes nothing more for a built-in action', async () => {
				setModuleActive(true);
				const { setAddedNodeActionParameters } = useActions();

				setAddedNodeActionParameters({
					name: 'Archive',
					key: SLACK_NODE_TYPE,
					value: { operation: 'archive', resource: 'channel' },
				});
				addNode({ ...addedNode, parameters: { operation: 'archive' } } as INodeUi);
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(setNodeParameters).not.toHaveBeenCalled();
			});

			test('waits for nothing with the module off', async () => {
				setModuleActive(false);
				const { setAddedNodeActionParameters } = useActions();

				setAddedNodeActionParameters({
					name: 'Archive channel',
					key: SLACK_NODE_TYPE,
					value: { operation: 'action-1@2', resource: '__CUSTOM_ACTION__' },
				});
				addNode(addedNode);
				await new Promise((resolve) => setTimeout(resolve, 0));

				expect(customActionSelection.whenLoaded).not.toHaveBeenCalled();
				expect(setNodeParameters).not.toHaveBeenCalled();
			});
		});

		test('with the module off, both functions return the same result as before', () => {
			setModuleActive(false);
			const { getActionData, actionDataToNodeTypeSelectedPayload } = useActions();

			const data = getActionData(actionItem('action-1@2', '__CUSTOM_ACTION__'));
			const payload = actionDataToNodeTypeSelectedPayload(data);

			expect(data.value).toEqual({ operation: 'action-1@2', resource: '__CUSTOM_ACTION__' });
			expect(payload.parameters).toEqual({
				operation: 'action-1@2',
				resource: '__CUSTOM_ACTION__',
			});
			expect(customActionSelection.pinValuesFor).not.toHaveBeenCalled();
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
