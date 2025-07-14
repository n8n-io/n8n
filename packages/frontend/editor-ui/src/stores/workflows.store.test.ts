import { setActivePinia, createPinia } from 'pinia';
import * as workflowsApi from '@/api/workflows';
import {
	DUPLICATE_POSTFFIX,
	FORM_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WAIT_NODE_TYPE,
} from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IExecutionResponse, INodeUi, IWorkflowDb, IWorkflowSettings } from '@/Interface';

import { deepCopy, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';
import type {
	IPinData,
	ExecutionSummary,
	IConnection,
	INodeExecutionData,
	INode,
} from 'n8n-workflow';
import { stringSizeInBytes } from '@/utils/typesUtils';
import { dataPinningEventBus } from '@/event-bus';
import { useUIStore } from '@/stores/ui.store';
import type { PushPayload, FrontendSettings } from '@n8n/api-types';
import { flushPromises } from '@vue/test-utils';
import { useNDVStore } from '@/stores/ndv.store';
import { mock } from 'vitest-mock-extended';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import * as apiUtils from '@n8n/rest-api-client';
import { useSettingsStore } from '@/stores/settings.store';
import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { waitFor } from '@testing-library/vue';

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

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<{}>();
	return {
		...actual,
		useLocalStorage: vi.fn().mockReturnValue({ value: undefined }),
	};
});

describe('useWorkflowsStore', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
		settingsStore = mockedStore(useSettingsStore);
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
			getNodeType.mockReturnValueOnce({ group: ['trigger'] });

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
		it('should return true when a node has issues and connected', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', issues: { error: ['Error message'] } },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			workflowsStore.workflow.connections = {
				Node1: { main: [[{ node: 'Node2' } as IConnection]] },
			};

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(true);
		});

		it('should return false when node has issues but it is not connected', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1', issues: { error: ['Error message'] } },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			const hasIssues = workflowsStore.nodesIssuesExist;
			expect(hasIssues).toBe(false);
		});

		it('should return false when no nodes have issues', () => {
			workflowsStore.workflow.nodes = [
				{ name: 'Node1' },
				{ name: 'Node2' },
			] as unknown as IWorkflowDb['nodes'];

			workflowsStore.workflow.connections = {
				Node1: { main: [[{ node: 'Node2' } as IConnection]] },
			};

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

		it('should return true if connection is indirect within `depth`', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode', 2);
			expect(result).toBe(true);
		});

		it('should return false if connection is indirect beyond `depth`', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'IntermediateNode' } as IConnection]] },
				IntermediateNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode', 1);
			expect(result).toBe(false);
		});

		it('should return false if depth is 0', () => {
			workflowsStore.workflow.connections = {
				RootNode: { main: [[{ node: 'SearchNode' } as IConnection]] },
			};

			const result = workflowsStore.isNodeInOutgoingNodeConnections('RootNode', 'SearchNode', 0);
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
			vi.mocked(workflowsApi).getWorkflows.mockResolvedValue({
				count: mockWorkflows.length,
				data: mockWorkflows,
			});

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
			uiStore.stateIsDirty = true;
			workflowsStore.workflowsById = { '1': { active: false } as IWorkflowDb };
			workflowsStore.workflow.id = '1';

			workflowsStore.setWorkflowActive('1');

			expect(workflowsStore.activeWorkflows).toContain('1');
			expect(workflowsStore.workflowsById['1'].active).toBe(true);
			expect(workflowsStore.workflow.active).toBe(true);
			expect(uiStore.stateIsDirty).toBe(false);
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

		it('should not set current workflow as active when it is not the target', () => {
			uiStore.stateIsDirty = true;
			workflowsStore.workflow.id = '1';
			workflowsStore.workflowsById = { '1': { active: false } as IWorkflowDb };
			workflowsStore.setWorkflowActive('2');
			expect(workflowsStore.workflowsById['1'].active).toBe(false);
			expect(uiStore.stateIsDirty).toBe(true);
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
			expect(track).toHaveBeenCalledWith('Manual exec errored', {
				error_title: 'invalid syntax',
				node_type: 'n8n-nodes-base.set',
				node_type_version: 3.4,
				node_id: '554c7ff4-7ee2-407c-8931-e34234c5056a',
				node_graph_string:
					'{"node_types":["n8n-nodes-base.set"],"node_connections":[],"nodes":{"0":{"id":"554c7ff4-7ee2-407c-8931-e34234c5056a","type":"n8n-nodes-base.set","version":3.4,"position":[680,180]}},"notes":{},"is_pinned":false}',
			});
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

		it('should replace placeholder task data in waiting nodes correctly', () => {
			const runWithExistingRunData = deepCopy(executionResponse);
			runWithExistingRunData.data = {
				resultData: {
					runData: {
						[successEvent.nodeName]: [
							{
								hints: [],
								startTime: 1727867966633,
								executionIndex: 2,
								executionTime: 1,
								source: [],
								executionStatus: 'waiting',
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
						],
					},
				},
			};
			workflowsStore.setWorkflowExecutionData(runWithExistingRunData);

			workflowsStore.nodesByName[successEvent.nodeName] = mock<INodeUi>({
				type: 'n8n-nodes-base.manualTrigger',
			});

			// ACT
			workflowsStore.updateNodeExecutionData(successEvent);

			expect(workflowsStore.workflowExecutionData).toEqual({
				...runWithExistingRunData,
				data: {
					resultData: {
						runData: {
							[successEvent.nodeName]: [successEvent.data],
						},
					},
				},
			});
		});
		it('should replace existing placeholder task data in new log view', () => {
			const successEventWithExecutionIndex = deepCopy(successEvent);
			successEventWithExecutionIndex.data.executionIndex = 1;

			const runWithExistingRunData = executionResponse;
			runWithExistingRunData.data = {
				resultData: {
					runData: {
						[successEventWithExecutionIndex.nodeName]: [
							{
								hints: [],
								startTime: 1727867966633,
								executionIndex: successEventWithExecutionIndex.data.executionIndex,
								executionTime: 1,
								source: [],
								executionStatus: 'running',
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
						],
					},
				},
			};
			workflowsStore.setWorkflowExecutionData(runWithExistingRunData);

			workflowsStore.nodesByName[successEvent.nodeName] = mock<INodeUi>({
				type: 'n8n-nodes-base.manualTrigger',
			});

			// ACT
			workflowsStore.updateNodeExecutionData(successEventWithExecutionIndex);

			expect(workflowsStore.workflowExecutionData).toEqual({
				...executionResponse,
				data: {
					resultData: {
						runData: {
							[successEvent.nodeName]: [successEventWithExecutionIndex.data],
						},
					},
				},
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

	describe('setNodes()', () => {
		it('should transform credential-only nodes', () => {
			const setNodeId = '1';
			const credentialOnlyNodeId = '2';
			workflowsStore.setNodes([
				mock<INode>({
					id: setNodeId,
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
				}),
				mock<INode>({
					id: credentialOnlyNodeId,
					name: 'AlienVault Request',
					type: 'n8n-nodes-base.httpRequest',
					extendsCredential: 'alienVaultApi',
				}),
			]);

			expect(workflowsStore.workflow.nodes[0].id).toEqual(setNodeId);
			expect(workflowsStore.workflow.nodes[1].id).toEqual(credentialOnlyNodeId);
			expect(workflowsStore.workflow.nodes[1].type).toEqual('n8n-creds-base.alienVaultApi');
			expect(workflowsStore.nodeMetadata).toEqual({
				'AlienVault Request': { pristine: true },
				'Edit Fields': { pristine: true },
			});
		});
	});

	describe('updateNodeAtIndex', () => {
		it.each([
			{
				description: 'should update node at given index with provided data',
				nodeIndex: 0,
				nodeData: { name: 'Updated Node' },
				initialNodes: [{ name: 'Original Node' }],
				expectedNodes: [{ name: 'Updated Node' }],
				expectedResult: true,
			},
			{
				description: 'should not update node if index is invalid',
				nodeIndex: -1,
				nodeData: { name: 'Updated Node' },
				initialNodes: [{ name: 'Original Node' }],
				expectedNodes: [{ name: 'Original Node' }],
				expectedResult: false,
			},
			{
				description: 'should return false if node data is unchanged',
				nodeIndex: 0,
				nodeData: { name: 'Original Node' },
				initialNodes: [{ name: 'Original Node' }],
				expectedNodes: [{ name: 'Original Node' }],
				expectedResult: false,
			},
			{
				description: 'should update multiple properties of a node',
				nodeIndex: 0,
				nodeData: { name: 'Updated Node', type: 'newType' },
				initialNodes: [{ name: 'Original Node', type: 'oldType' }],
				expectedNodes: [{ name: 'Updated Node', type: 'newType' }],
				expectedResult: true,
			},
		])('$description', ({ nodeIndex, nodeData, initialNodes, expectedNodes, expectedResult }) => {
			workflowsStore.workflow.nodes = initialNodes as unknown as IWorkflowDb['nodes'];

			const result = workflowsStore.updateNodeAtIndex(nodeIndex, nodeData);

			expect(result).toBe(expectedResult);
			expect(workflowsStore.workflow.nodes).toEqual(expectedNodes);
		});

		it('should throw error if out of bounds', () => {
			workflowsStore.workflow.nodes = [];
			expect(() => workflowsStore.updateNodeAtIndex(0, { name: 'Updated Node' })).toThrowError();
		});
	});

	test.each([
		// check userVersion behavior
		[-1, 1, 1], // userVersion -1, use default (1)
		[0, 1, 1], // userVersion 0, invalid, use default (1)
		[1, 1, 1], // userVersion 1, valid, use userVersion (1)
		[2, 1, 2], // userVersion 2, valid, use userVersion (2)
		[-1, 2, 2], // userVersion -1, use default (2)
		[0, 2, 1], // userVersion 0, invalid, use default (2)
		[1, 2, 1], // userVersion 1, valid, use userVersion (1)
		[2, 2, 2], // userVersion 2, valid, use userVersion (2)
	] as Array<[number, 1 | 2, number]>)(
		'when { userVersion:%s, defaultVersion:%s, enforced:%s } run workflow should use partial execution version %s',
		async (userVersion, defaultVersion, expectedVersion) => {
			vi.mocked(useLocalStorage).mockReturnValueOnce(ref(userVersion));
			settingsStore.settings = {
				partialExecution: { version: defaultVersion },
			} as FrontendSettings;

			const workflowData = { id: '1', nodes: [], connections: {} };
			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockImplementation(async () => ({}));

			await workflowsStore.runWorkflow({ workflowData });

			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				{ baseUrl: '/rest', pushRef: expect.any(String) },
				'POST',
				`/workflows/1/run?partialExecutionVersion=${expectedVersion}`,
				{ workflowData },
			);
		},
	);

	describe('findNodeByPartialId', () => {
		test.each([
			[[], 'D', undefined],
			[['A', 'B', 'C'], 'D', undefined],
			[['A', 'B', 'C'], 'B', 1],
			[['AA', 'BB', 'CC'], 'B', 1],
			[['AA', 'BB', 'BC'], 'B', 1],
			[['AA', 'BB', 'BC'], 'BC', 2],
		] as Array<[string[], string, number | undefined]>)(
			'with input %s , %s returns node with index %s',
			(ids, id, expectedIndex) => {
				workflowsStore.workflow.nodes = ids.map((x) => ({ id: x }) as never);

				expect(workflowsStore.findNodeByPartialId(id)).toBe(
					workflowsStore.workflow.nodes[expectedIndex ?? -1],
				);
			},
		);
	});

	describe('getPartialIdForNode', () => {
		test.each([
			[[], 'Alphabet', 'Alphabet'],
			[['Alphabet'], 'Alphabet', 'Alphab'],
			[['Alphabet', 'Alphabeta'], 'Alphabeta', 'Alphabeta'],
			[['Alphabet', 'Alphabeta', 'Alphabetagamma'], 'Alphabet', 'Alphabet'],
			[['Alphabet', 'Alphabeta', 'Alphabetagamma'], 'Alphabeta', 'Alphabeta'],
			[['Alphabet', 'Alphabeta', 'Alphabetagamma'], 'Alphabetagamma', 'Alphabetag'],
		] as Array<[string[], string, string]>)(
			'with input %s , %s returns %s',
			(ids, id, expected) => {
				workflowsStore.workflow.nodes = ids.map((x) => ({ id: x }) as never);

				expect(workflowsStore.getPartialIdForNode(id)).toBe(expected);
			},
		);
	});

	describe('archiveWorkflow', () => {
		it('should call the API to archive the workflow', async () => {
			const workflowId = '1';
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';

			workflowsStore.workflowsById = {
				'1': { active: true, isArchived: false, versionId } as IWorkflowDb,
			};
			workflowsStore.workflow.active = true;
			workflowsStore.workflow.isArchived = false;
			workflowsStore.workflow.id = workflowId;
			workflowsStore.workflow.versionId = versionId;

			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockImplementation(async () => ({
					versionId: updatedVersionId,
				}));

			await workflowsStore.archiveWorkflow(workflowId);

			expect(workflowsStore.workflowsById['1'].active).toBe(false);
			expect(workflowsStore.workflowsById['1'].isArchived).toBe(true);
			expect(workflowsStore.workflowsById['1'].versionId).toBe(updatedVersionId);
			expect(workflowsStore.workflow.active).toBe(false);
			expect(workflowsStore.workflow.isArchived).toBe(true);
			expect(workflowsStore.workflow.versionId).toBe(updatedVersionId);
			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'POST',
				`/workflows/${workflowId}/archive`,
			);
		});
	});

	describe('unarchiveWorkflow', () => {
		it('should call the API to unarchive the workflow', async () => {
			const workflowId = '1';
			const versionId = '00000000-0000-0000-0000-000000000000';
			const updatedVersionId = '11111111-1111-1111-1111-111111111111';

			workflowsStore.workflowsById = {
				'1': { active: false, isArchived: true, versionId } as IWorkflowDb,
			};
			workflowsStore.workflow.active = false;
			workflowsStore.workflow.isArchived = true;
			workflowsStore.workflow.id = workflowId;
			workflowsStore.workflow.versionId = versionId;

			const makeRestApiRequestSpy = vi
				.spyOn(apiUtils, 'makeRestApiRequest')
				.mockImplementation(async () => ({
					versionId: updatedVersionId,
				}));

			await workflowsStore.unarchiveWorkflow(workflowId);

			expect(workflowsStore.workflowsById['1'].active).toBe(false);
			expect(workflowsStore.workflowsById['1'].isArchived).toBe(false);
			expect(workflowsStore.workflowsById['1'].versionId).toBe(updatedVersionId);
			expect(workflowsStore.workflow.active).toBe(false);
			expect(workflowsStore.workflow.isArchived).toBe(false);
			expect(workflowsStore.workflow.versionId).toBe(updatedVersionId);
			expect(makeRestApiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					baseUrl: '/rest',
					pushRef: expect.any(String),
				}),
				'POST',
				`/workflows/${workflowId}/unarchive`,
			);
		});
	});

	describe('setNodeParameters', () => {
		beforeEach(() => {
			workflowsStore.setNodes([createTestNode({ name: 'a', parameters: { p: 1, q: true } })]);
		});

		it('should set node parameters', () => {
			expect(workflowsStore.nodesByName.a.parameters).toEqual({ p: 1, q: true });

			workflowsStore.setNodeParameters({ name: 'a', value: { q: false, r: 's' } });

			expect(workflowsStore.nodesByName.a.parameters).toEqual({ q: false, r: 's' });
		});

		it('should set node parameters preserving existing ones if append=true', () => {
			expect(workflowsStore.nodesByName.a.parameters).toEqual({ p: 1, q: true });

			workflowsStore.setNodeParameters({ name: 'a', value: { q: false, r: 's' } }, true);

			expect(workflowsStore.nodesByName.a.parameters).toEqual({ p: 1, q: false, r: 's' });
		});

		it('should not update last parameter update time if parameters are set to the same value', () => {
			expect(workflowsStore.getParametersLastUpdate('a')).toEqual(undefined);

			workflowsStore.setNodeParameters({ name: 'a', value: { p: 1, q: true } });

			expect(workflowsStore.getParametersLastUpdate('a')).toEqual(undefined);
		});
	});

	describe('renameNodeSelectedAndExecution', () => {
		it('should rename node and update execution data', () => {
			const nodeName = 'Rename me';
			const newName = 'Renamed';

			workflowsStore.workflowExecutionData = {
				data: {
					resultData: {
						runData: {
							"When clicking 'Test workflow'": [
								{
									startTime: 1747389900668,
									executionIndex: 0,
									source: [],
									hints: [],
									executionTime: 1,
									executionStatus: 'success',
									data: {},
								},
							],
							[nodeName]: [
								{
									startTime: 1747389900670,
									executionIndex: 2,
									source: [
										{
											previousNode: "When clicking 'Test workflow'",
										},
									],
									hints: [],
									executionTime: 1,
									executionStatus: 'success',
									data: {},
								},
							],
							'Edit Fields': [
								{
									startTime: 1747389900671,
									executionIndex: 3,
									source: [
										{
											previousNode: nodeName,
										},
									],
									hints: [],
									executionTime: 3,
									executionStatus: 'success',
									data: {},
								},
							],
						},
						pinData: {
							[nodeName]: [
								{
									json: {
										foo: 'bar',
									},
									pairedItem: [
										{
											item: 0,
											sourceOverwrite: {
												previousNode: "When clicking 'Test workflow'",
											},
										},
									],
								},
							],
							'Edit Fields': [
								{
									json: {
										bar: 'foo',
									},
									pairedItem: {
										item: 1,
										sourceOverwrite: {
											previousNode: nodeName,
										},
									},
								},
							],
						},
						lastNodeExecuted: 'Edit Fields',
					},
				},
			} as unknown as IExecutionResponse;

			workflowsStore.addNode({
				parameters: {},
				id: '554c7ff4-7ee2-407c-8931-e34234c5056a',
				name: nodeName,
				type: 'n8n-nodes-base.set',
				position: [680, 180],
				typeVersion: 3.4,
			});

			workflowsStore.workflow.pinData = {
				[nodeName]: [
					{
						json: {
							foo: 'bar',
						},
						pairedItem: {
							item: 2,
							sourceOverwrite: {
								previousNode: "When clicking 'Test workflow'",
							},
						},
					},
				],
				'Edit Fields': [
					{
						json: {
							bar: 'foo',
						},
						pairedItem: [
							{
								item: 3,
								sourceOverwrite: {
									previousNode: nodeName,
								},
							},
						],
					},
				],
			};

			workflowsStore.renameNodeSelectedAndExecution({ old: nodeName, new: newName });

			expect(workflowsStore.nodeMetadata[nodeName]).not.toBeDefined();
			expect(workflowsStore.nodeMetadata[newName]).toEqual({});
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.runData[nodeName],
			).not.toBeDefined();
			expect(workflowsStore.workflowExecutionData?.data?.resultData.runData[newName]).toBeDefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.runData['Edit Fields'][0].source,
			).toEqual([
				{
					previousNode: newName,
				},
			]);
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.pinData?.[nodeName],
			).not.toBeDefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.pinData?.[newName],
			).toBeDefined();
			expect(
				workflowsStore.workflowExecutionData?.data?.resultData.pinData?.['Edit Fields'][0]
					.pairedItem,
			).toEqual({
				item: 1,
				sourceOverwrite: {
					previousNode: newName,
				},
			});

			expect(workflowsStore.workflow.pinData?.[nodeName]).not.toBeDefined();
			expect(workflowsStore.workflow.pinData?.[newName]).toBeDefined();
			expect(workflowsStore.workflow.pinData?.['Edit Fields'][0].pairedItem).toEqual([
				{
					item: 3,
					sourceOverwrite: {
						previousNode: newName,
					},
				},
			]);
		});
	});

	describe('selectedTriggerNode', () => {
		const n0 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n0' });
		const n1 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n1' });
		const n2 = createTestNode({ type: MANUAL_TRIGGER_NODE_TYPE, name: 'n2' });

		beforeEach(() => {
			workflowsStore.setNodes([n0, n1]);
			getNodeType.mockImplementation(() => mockNodeTypeDescription({ group: ['trigger'] }));
		});

		it('should select newly added trigger node automatically', async () => {
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n0'));
			workflowsStore.addNode(n2);
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n2'));
		});

		it('should re-select a trigger when selected trigger gets disabled or removed', async () => {
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n0'));
			workflowsStore.removeNode(n0);
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe('n1'));
			workflowsStore.setNodeValue({ name: 'n1', key: 'disabled', value: true });
			await waitFor(() => expect(workflowsStore.selectedTriggerNodeName).toBe(undefined));
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
			isArchived: false,
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
		nodeName: 'When clicking ‘Execute workflow’',
		data: {
			hints: [],
			startTime: 1727867966633,
			executionIndex: 0,
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
			executionIndex: 0,
			executionTime: 2,
			source: [
				{
					previousNode: 'When clicking ‘Execute workflow’',
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
