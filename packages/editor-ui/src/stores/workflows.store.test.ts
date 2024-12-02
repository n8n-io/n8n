import { setActivePinia, createPinia } from 'pinia';
import * as workflowsApi from '@/api/workflows';
import {
	DUPLICATE_POSTFFIX,
	FORM_NODE_TYPE,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WAIT_NODE_TYPE,
} from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IExecutionResponse, INodeUi, IWorkflowDb, IWorkflowSettings } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

import { SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type { IPinData, ExecutionSummary, IConnection, INodeExecutionData } from 'n8n-workflow';
import { stringSizeInBytes } from '@/utils/typesUtils';
import { dataPinningEventBus } from '@/event-bus';
import { useUIStore } from '@/stores/ui.store';
import type { PushPayload } from '@n8n/api-types';
import { flushPromises } from '@vue/test-utils';
import { useNDVStore } from '@/stores/ndv.store';
import { mock } from 'vitest-mock-extended';

vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: vi.fn(() => ({
		activeNode: null,
	})),
}));

vi.mock('@/api/workflows', () => ({
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
	getNewWorkflow: vi.fn(),
}));

const getNodeType = vi.fn();
vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

const track = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

describe('useWorkflowsStore', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		track.mockReset();
	});

	it('should initialize with default state', () => {
		expect(workflowsStore.workflow.name).toBe('');
		expect(workflowsStore.workflow.id).toBe(PLACEHOLDER_EMPTY_WORKFLOW_ID);
	});

	describe('isWaitingExecution', () => {
		it('should return false if no activeNode and no waiting nodes in workflow', () => {
			workflowsStore.workflow.nodes = [
				{ type: 'type1' },
				{ type: 'type2' },
			] as unknown as IWorkflowDb['nodes'];

			const isWaiting = workflowsStore.isWaitingExecution;
			expect(isWaiting).toEqual(false);
		});

		it('should return false if no activeNode and waiting node in workflow and waiting node is disabled', () => {
			workflowsStore.workflow.nodes = [
				{ type: FORM_NODE_TYPE, disabled: true },
				{ type: 'type2' },
			] as unknown as IWorkflowDb['nodes'];

			const isWaiting = workflowsStore.isWaitingExecution;
			expect(isWaiting).toEqual(false);
		});

		it('should return true if no activeNode and wait node in workflow', () => {
			workflowsStore.workflow.nodes = [
				{ type: WAIT_NODE_TYPE },
				{ type: 'type2' },
			] as unknown as IWorkflowDb['nodes'];

			const isWaiting = workflowsStore.isWaitingExecution;
			expect(isWaiting).toEqual(true);
		});

		it('should return true if no activeNode and form node in workflow', () => {
			workflowsStore.workflow.nodes = [
				{ type: FORM_NODE_TYPE },
				{ type: 'type2' },
			] as unknown as IWorkflowDb['nodes'];

			const isWaiting = workflowsStore.isWaitingExecution;
			expect(isWaiting).toEqual(true);
		});

		it('should return true if no activeNode and sendAndWait node in workflow', () => {
			workflowsStore.workflow.nodes = [
				{ type: 'type1', parameters: { operation: SEND_AND_WAIT_OPERATION } },
				{ type: 'type2' },
			] as unknown as IWorkflowDb['nodes'];

			const isWaiting = workflowsStore.isWaitingExecution;
			expect(isWaiting).toEqual(true);
		});

		it('should return true if activeNode is waiting node', () => {
			vi.mocked(useNDVStore).mockReturnValue({
				activeNode: { type: WAIT_NODE_TYPE } as unknown as INodeUi,
			} as unknown as ReturnType<typeof useNDVStore>);

			const isWaiting = workflowsStore.isWaitingExecution;
			expect(isWaiting).toEqual(true);
		});
	});

	describe('allWorkflows', () => {
		it('should return sorted workflows by name', () => {
			workflowsStore.setWorkflows([
				{ id: '3', name: 'Zeta' },
				{ id: '1', name: 'Alpha' },
				{ id: '2', name: 'Beta' },
			] as IWorkflowDb[]);

			const allWorkflows = workflowsStore.allWorkflows;
			expect(allWorkflows[0].name).toBe('Alpha');
			expect(allWorkflows[1].name).toBe('Beta');
			expect(allWorkflows[2].name).toBe('Zeta');
		});

		it('should return empty array when no workflows are set', () => {
			workflowsStore.setWorkflows([]);

			const allWorkflows = workflowsStore.allWorkflows;
			expect(allWorkflows).toEqual([]);
		});
	});

	describe('isNewWorkflow', () => {
		it('should return true for a new workflow', () => {
			expect(workflowsStore.isNewWorkflow).toBe(true);
		});

		it('should return false for an existing workflow', () => {
			workflowsStore.setWorkflowId('123');
			expect(workflowsStore.isNewWorkflow).toBe(false);
		});
	});

	describe('workflowTriggerNodes', () => {
		it('should return only nodes that are triggers', () => {
			vi.mocked(useNodeTypesStore).mockReturnValueOnce({
				getNodeType: vi.fn(() => ({
					group: ['trigger'],
				})),
			} as unknown as ReturnType<typeof useNodeTypesStore>);

			workflowsStore.workflow.nodes = [
				{ type: 'triggerNode', typeVersion: '1' },
				{ type: 'nonTriggerNode', typeVersion: '1' },
			] as unknown as IWorkflowDb['nodes'];

			expect(workflowsStore.workflowTriggerNodes).toHaveLength(1);
			expect(workflowsStore.workflowTriggerNodes[0].type).toBe('triggerNode');
		});

		it('should return empty array when no nodes are triggers', () => {
			workflowsStore.workflow.nodes = [
				{ type: 'nonTriggerNode1', typeVersion: '1' },
				{ type: 'nonTriggerNode2', typeVersion: '1' },
			] as unknown as IWorkflowDb['nodes'];

			expect(workflowsStore.workflowTriggerNodes).toHaveLength(0);
		});
	});

	describe('currentWorkflowHasWebhookNode', () => {
		it('should return true when a node has a webhookId', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', webhookId: 'webhook1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasWebhookNode = workflowsStore.currentWorkflowHasWebhookNode;
			expect(hasWebhookNode).toBe(true);
		});

		it('should return false when no nodes have a webhookId', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasWebhookNode = workflowsStore.currentWorkflowHasWebhookNode;
			expect(hasWebhookNode).toBe(false);
		});

		it('should return false when there are no nodes', () => {
			workflowsStore.workflow.nodes = [];

			const hasWebhookNode = workflowsStore.currentWorkflowHasWebhookNode;
			expect(hasWebhookNode).toBe(false);
		});
	});

	describe('getWorkflowRunData', () => {
		it('should return null when no execution data is present', () => {
			workflowsStore.workflowExecutionData = null;

			const runData = workflowsStore.getWorkflowRunData;
			expect(runData).toBeNull();
		});

		it('should return null when execution data does not contain resultData', () => {
			workflowsStore.workflowExecutionData = { data: {} } as IExecutionResponse;

			const runData = workflowsStore.getWorkflowRunData;
			expect(runData).toBeNull();
		});

		it('should return runData when execution data contains resultData', () => {
			const expectedRunData = { node1: [{}, {}], node2: [{}] };
			workflowsStore.workflowExecutionData = {
				data: { resultData: { runData: expectedRunData } },
			} as unknown as IExecutionResponse;

			const runData = workflowsStore.getWorkflowRunData;
			expect(runData).toEqual(expectedRunData);
		});
	});

	describe('nodesIssuesExist', () => {
		it('should return true when a node has issues', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', issues: { error: ['Error message'] } },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(true);
		});

		it('should return false when no nodes have issues', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(false);
		});

		it('should return false when there are no nodes', () => {
			workflowsStore.workflow.nodes = [];

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(false);
		});
	});

	describe('shouldReplaceInputDataWithPinData', () => {
		it('should return true when no active workflow execution', () => {
			workflowsStore.activeWorkflowExecution = null;

			expect(workflowsStore.shouldReplaceInputDataWithPinData).toBe(true);
		});

		it('should return true when active workflow execution mode is manual', () => {
			workflowsStore.activeWorkflowExecution = { mode: 'manual' } as unknown as ExecutionSummary;

			expect(workflowsStore.shouldReplaceInputDataWithPinData).toBe(true);
		});

		it('should return false when active workflow execution mode is not manual', () => {
			workflowsStore.activeWorkflowExecution = { mode: 'automatic' } as unknown as ExecutionSummary;

			expect(workflowsStore.shouldReplaceInputDataWithPinData).toBe(false);
		});
	});

	describe('getWorkflowResultDataByNodeName()', () => {
		it('should return null when no workflow run data is present', () => {
			workflowsStore.workflowExecutionData = null;

			const resultData = workflowsStore.getWorkflowResultDataByNodeName('Node1');
			expect(resultData).toBeNull();
		});

		it('should return null when node name is not present in workflow run data', () => {
			workflowsStore.workflowExecutionData = {
				data: { resultData: { runData: {} } },
			} as unknown as IExecutionResponse;

			const resultData = workflowsStore.getWorkflowResultDataByNodeName('Node1');
			expect(resultData).toBeNull();
		});

		it('should return result data when node name is present in workflow run data', () => {
			const expectedData = [{}, {}];
			workflowsStore.workflowExecutionData = {
				data: { resultData: { runData: { Node1: expectedData } } },
			} as unknown as IExecutionResponse;

			const resultData = workflowsStore.getWorkflowResultDataByNodeName('Node1');
			expect(resultData).toEqual(expectedData);
		});
	});

	describe('isNodeInOutgoingNodeConnections()', () => {
		it('should return false when no outgoing connections from root node', () => {
			workflowsStore.workflow.connections = {};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(false);
		});

		it('should return true when search node is directly connected to root node', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(true);
		});

		it('should return true when search node is indirectly connected to root node', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(true);
		});

		it('should return false when search node is not connected to root node', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'AnotherNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode');
			expect(result).toBe(false);
		});
	});

	describe('getPinDataSize()', () => {
		it('returns zero when pinData is empty', () => {
			const pinData = {};
			const result = workflowsStore.getPinDataSize(pinData);
			expect(result).toBe(0);
		});

		it('returns correct size when pinData contains string values', () => {
			const pinData = {
				key1: 'value1',
				key2: 'value2',
			} as Record<string, string | INodeExecutionData[]>;
			const result = workflowsStore.getPinDataSize(pinData);
			expect(result).toBe(stringSizeInBytes(pinData.key1) + stringSizeInBytes(pinData.key2));
		});

		it('returns correct size when pinData contains array values', () => {
			const pinData = {
				key1: [{ parameters: 'value1', data: null }],
				key2: [{ parameters: 'value2', data: null }],
			} as unknown as Record<string, string | INodeExecutionData[]>;
			const result = workflowsStore.getPinDataSize(pinData);
			expect(result).toBe(stringSizeInBytes(pinData.key1) + stringSizeInBytes(pinData.key2));
		});

		it('returns correct size when pinData contains mixed string and array values', () => {
			const pinData = {
				key1: 'value1',
				key2: [{ parameters: 'value2', data: null }],
			} as unknown as Record<string, string | INodeExecutionData[]>;
			const result = workflowsStore.getPinDataSize(pinData);
			expect(result).toBe(stringSizeInBytes(pinData.key1) + stringSizeInBytes(pinData.key2));
		});
	});

	describe('fetchAllWorkflows()', () => {
		it('should fetch workflows successfully', async () => {
			const mockWorkflows = [{ id: '1', name: 'Test Workflow' }] as IWorkflowDb[];
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue(mockWorkflows);

			await workflowsStore.fetchAllWorkflows();

			expect(workflowsApi.getWorkflows).toHaveBeenCalled();
			expect(Object.values(workflowsStore.workflowsById)).toEqual(mockWorkflows);
		});
	});

	describe('setWorkflowName()', () => {
		it('should set the workflow name correctly', () => {
			workflowsStore.setWorkflowName({ newName: 'New Workflow Name', setStateDirty: false });
			expect(workflowsStore.workflow.name).toBe('New Workflow Name');
		});
	});

	describe('setWorkflowActive()', () => {
		it('should set workflow as active when it is not already active', () => {
			workflowsStore.workflowsById = { '1': { active: false } as IWorkflowDb };
			workflowsStore.workflow.id = '1';

			workflowsStore.setWorkflowActive('1');

			expect(workflowsStore.activeWorkflows).toContain('1');
			expect(workflowsStore.workflowsById['1'].active).toBe(true);
			expect(workflowsStore.workflow.active).toBe(true);
		});

		it('should not modify active workflows when workflow is already active', () => {
			workflowsStore.activeWorkflows = ['1'];
			workflowsStore.workflowsById = { '1': { active: true } as IWorkflowDb };
			workflowsStore.workflow.id = '1';

			workflowsStore.setWorkflowActive('1');

			expect(workflowsStore.activeWorkflows).toEqual(['1']);
			expect(workflowsStore.workflowsById['1'].active).toBe(true);
			expect(workflowsStore.workflow.active).toBe(true);
		});
	});

	describe('setWorkflowInactive()', () => {
		it('should set workflow as inactive when it exists', () => {
			workflowsStore.activeWorkflows = ['1', '2'];
			workflowsStore.workflowsById = { '1': { active: true } as IWorkflowDb };
			workflowsStore.setWorkflowInactive('1');
			expect(workflowsStore.workflowsById['1'].active).toBe(false);
			expect(workflowsStore.activeWorkflows).toEqual(['2']);
		});

		it('should not modify active workflows when workflow is not active', () => {
			workflowsStore.workflowsById = { '2': { active: true } as IWorkflowDb };
			workflowsStore.activeWorkflows = ['2'];
			workflowsStore.setWorkflowInactive('1');
			expect(workflowsStore.activeWorkflows).toEqual(['2']);
			expect(workflowsStore.workflowsById['2'].active).toBe(true);
		});

		it('should set current workflow as inactive when it is the target', () => {
			workflowsStore.workflow.id = '1';
			workflowsStore.workflow.active = true;
			workflowsStore.setWorkflowInactive('1');
			expect(workflowsStore.workflow.active).toBe(false);
		});
	});

	describe('getDuplicateCurrentWorkflowName()', () => {
		it('should return the same name if appending postfix exceeds max length', async () => {
			const longName = 'a'.repeat(MAX_WORKFLOW_NAME_LENGTH - DUPLICATE_POSTFFIX.length + 1);
			const newName = await workflowsStore.getDuplicateCurrentWorkflowName(longName);
			expect(newName).toBe(longName);
		});

		it('should append postfix to the name if it does not exceed max length', async () => {
			const name = 'TestWorkflow';
			const expectedName = `${name}${DUPLICATE_POSTFFIX}`;
			vi.mocked(workflowsApi).getNewWorkflow.mockResolvedValue({
				name: expectedName,
				settings: {} as IWorkflowSettings,
			});
			const newName = await workflowsStore.getDuplicateCurrentWorkflowName(name);
			expect(newName).toBe(expectedName);
		});

		it('should handle API failure gracefully', async () => {
			const name = 'TestWorkflow';
			const expectedName = `${name}${DUPLICATE_POSTFFIX}`;
			vi.mocked(workflowsApi).getNewWorkflow.mockRejectedValue(new Error('API Error'));
			const newName = await workflowsStore.getDuplicateCurrentWorkflowName(name);
			expect(newName).toBe(expectedName);
		});
	});

	describe('pinData', () => {
		it('should create pinData object if it does not exist', async () => {
			workflowsStore.workflow.pinData = undefined;
			const node = { name: 'TestNode' } as INodeUi;
			const data = [{ json: 'testData' }] as unknown as INodeExecutionData[];
			workflowsStore.pinData({ node, data });
			expect(workflowsStore.workflow.pinData).toBeDefined();
		});

		it('should convert data to array if it is not', async () => {
			const node = { name: 'TestNode' } as INodeUi;
			const data = { json: 'testData' } as unknown as INodeExecutionData;
			workflowsStore.pinData({ node, data: data as unknown as INodeExecutionData[] });
			expect(Array.isArray(workflowsStore.workflow.pinData?.[node.name])).toBe(true);
		});

		it('should store pinData correctly', async () => {
			const node = { name: 'TestNode' } as INodeUi;
			const data = [{ json: 'testData' }] as unknown as INodeExecutionData[];
			workflowsStore.pinData({ node, data });
			expect(workflowsStore.workflow.pinData?.[node.name]).toEqual(data);
		});

		it('should emit pin-data event', async () => {
			const node = { name: 'TestNode' } as INodeUi;
			const data = [{ json: 'testData' }] as unknown as INodeExecutionData[];
			const emitSpy = vi.spyOn(dataPinningEventBus, 'emit');
			workflowsStore.pinData({ node, data });
			expect(emitSpy).toHaveBeenCalledWith('pin-data', { [node.name]: data });
		});

		it('should set stateIsDirty to true', async () => {
			uiStore.stateIsDirty = false;
			const node = { name: 'TestNode' } as INodeUi;
			const data = [{ json: 'testData' }] as unknown as INodeExecutionData[];
			workflowsStore.pinData({ node, data });
			expect(uiStore.stateIsDirty).toBe(true);
		});
	});

	describe('updateNodeExecutionData', () => {
		const { successEvent, errorEvent, executionResponse } = generateMockExecutionEvents();
		it('should throw error if not initialized', () => {
			expect(() => workflowsStore.updateNodeExecutionData(successEvent)).toThrowError();
		});

		it('should add node success run data', () => {
			workflowsStore.setWorkflowExecutionData(executionResponse);

			workflowsStore.nodesByName[successEvent.nodeName] = mock<INodeUi>({
				type: 'n8n-nodes-base.manualTrigger',
			});

			// ACT
			workflowsStore.updateNodeExecutionData(successEvent);

			expect(workflowsStore.workflowExecutionData).toEqual({
				...executionResponse,
				data: {
					resultData: {
						runData: {
							[successEvent.nodeName]: [successEvent.data],
						},
					},
				},
			});
		});

		it('should add node error event and track errored executions', async () => {
			workflowsStore.setWorkflowExecutionData(executionResponse);
			workflowsStore.addNode({
				parameters: {},
				id: '554c7ff4-7ee2-407c-8931-e34234c5056a',
				name: 'Edit Fields',
				type: 'n8n-nodes-base.set',
				position: [680, 180],
				typeVersion: 3.4,
			});

			getNodeType.mockReturnValue(getMockEditFieldsNode());

			// ACT
			workflowsStore.updateNodeExecutionData(errorEvent);
			await flushPromises();

			expect(workflowsStore.workflowExecutionData).toEqual({
				...executionResponse,
				data: {
					resultData: {
						runData: {
							[errorEvent.nodeName]: [errorEvent.data],
						},
					},
				},
			});
			expect(track).toHaveBeenCalledWith(
				'Manual exec errored',
				{
					error_title: 'invalid syntax',
					node_type: 'n8n-nodes-base.set',
					node_type_version: 3.4,
					node_id: '554c7ff4-7ee2-407c-8931-e34234c5056a',
					node_graph_string:
						'{"node_types":["n8n-nodes-base.set"],"node_connections":[],"nodes":{"0":{"id":"554c7ff4-7ee2-407c-8931-e34234c5056a","type":"n8n-nodes-base.set","version":3.4,"position":[680,180]}},"notes":{},"is_pinned":false}',
				},
				{
					withPostHog: true,
				},
			);
		});

		it('sets workflow pin data', () => {
			workflowsStore.workflow.pinData = undefined;
			const data: IPinData = {
				TestNode: [{ json: { test: true } }],
				TestNode1: [{ json: { test: false } }],
			};
			workflowsStore.setWorkflowPinData(data);
			expect(workflowsStore.workflow.pinData).toEqual(data);
		});

		it('sets workflow pin data, adding json keys', () => {
			workflowsStore.workflow.pinData = undefined;
			const data = {
				TestNode: [{ test: true }],
				TestNode1: [{ test: false }],
			};
			workflowsStore.setWorkflowPinData(data as unknown as IPinData);
			expect(workflowsStore.workflow.pinData).toEqual({
				TestNode: [{ json: { test: true } }],
				TestNode1: [{ json: { test: false } }],
			});
		});
	});

	describe('setNodeValue()', () => {
		it('should update a node', () => {
			const nodeName = 'Edit Fields';
			workflowsStore.addNode({
				parameters: {},
				id: '554c7ff4-7ee2-407c-8931-e34234c5056a',
				name: nodeName,
				type: 'n8n-nodes-base.set',
				position: [680, 180],
				typeVersion: 3.4,
			});

			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toBe(undefined);

			workflowsStore.setNodeValue({ name: 'Edit Fields', key: 'executeOnce', value: true });

			expect(workflowsStore.workflow.nodes[0].executeOnce).toBe(true);
			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toEqual(
				expect.any(Number),
			);
		});
	});

	describe('setNodePositionById()', () => {
		it('should NOT update parametersLastUpdatedAt', () => {
			const nodeName = 'Edit Fields';
			const nodeId = '554c7ff4-7ee2-407c-8931-e34234c5056a';
			workflowsStore.addNode({
				parameters: {},
				id: nodeId,
				name: nodeName,
				type: 'n8n-nodes-base.set',
				position: [680, 180],
				typeVersion: 3.4,
			});

			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toBe(undefined);

			workflowsStore.setNodePositionById(nodeId, [0, 0]);

			expect(workflowsStore.workflow.nodes[0].position).toStrictEqual([0, 0]);
			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toBe(undefined);
		});
	});
});

function getMockEditFieldsNode() {
	return {
		displayName: 'Edit Fields (Set)',
		name: 'n8n-nodes-base.set',
		icon: 'fa:pen',
		group: ['input'],
		description: 'Modify, add, or remove item fields',
		defaultVersion: 3.4,
		iconColor: 'blue',
		version: [3, 3.1, 3.2, 3.3, 3.4],
		subtitle: '={{$parameter["mode"]}}',
		defaults: {
			name: 'Edit Fields',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}

function generateMockExecutionEvents() {
	const executionResponse: IExecutionResponse = {
		id: '1',
		workflowData: {
			id: '1',
			name: '',
			createdAt: '1',
			updatedAt: '1',
			nodes: [],
			connections: {},
			active: false,
			versionId: '1',
		},
		finished: false,
		mode: 'cli',
		startedAt: new Date(),
		createdAt: new Date(),
		status: 'new',
		data: {
			resultData: {
				runData: {},
			},
		},
	};
	const successEvent: PushPayload<'nodeExecuteAfter'> = {
		executionId: '59',
		nodeName: 'When clicking ‘Test workflow’',
		data: {
			hints: [],
			startTime: 1727867966633,
			executionTime: 1,
			source: [],
			executionStatus: 'success',
			data: {
				main: [
					[
						{
							json: {},
							pairedItem: {
								item: 0,
							},
						},
					],
				],
			},
		},
	};

	const errorEvent: PushPayload<'nodeExecuteAfter'> = {
		executionId: '61',
		nodeName: 'Edit Fields',
		data: {
			hints: [],
			startTime: 1727869043441,
			executionTime: 2,
			source: [
				{
					previousNode: 'When clicking ‘Test workflow’',
				},
			],
			executionStatus: 'error',
			// @ts-expect-error simpler data type, not BE class with methods
			error: {
				level: 'error',
				tags: {
					packageName: 'workflow',
				},
				context: {
					itemIndex: 0,
				},
				functionality: 'regular',
				name: 'NodeOperationError',
				timestamp: 1727869043442,
				node: {
					parameters: {
						mode: 'manual',
						duplicateItem: false,
						assignments: {
							assignments: [
								{
									id: '87afdb19-4056-4551-93ef-d0126a34eb83',
									name: "={{ $('Wh }}",
									value: '',
									type: 'string',
								},
							],
						},
						includeOtherFields: false,
						options: {},
					},
					id: '9fb34d2d-7191-48de-8f18-91a6a28d0230',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [1120, 180],
				},
				messages: [],
				message: 'invalid syntax',
				stack: 'NodeOperationError: invalid syntax',
			},
		},
	};

	return { executionResponse, errorEvent, successEvent };
}
