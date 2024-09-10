import { setActivePinia, createPinia } from 'pinia';
import * as workflowsApi from '@/api/workflows';
import {
	DUPLICATE_POSTFFIX,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
} from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IExecutionResponse, INodeUi, IWorkflowDb, IWorkflowSettings } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type { ExecutionSummary, IConnection, INodeExecutionData } from 'n8n-workflow';
import { stringSizeInBytes } from '@/utils/typesUtils';
import { dataPinningEventBus } from '@/event-bus';
import { useUIStore } from '@/stores/ui.store';

vi.mock('@/api/workflows', () => ({
	getWorkflows: vi.fn(),
	getWorkflow: vi.fn(),
	getNewWorkflow: vi.fn(),
}));

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn(),
	})),
}));

describe('useWorkflowsStore', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		workflowsStore = useWorkflowsStore();
		uiStore = useUIStore();
	});

	it('should initialize with default state', () => {
		expect(workflowsStore.workflow.name).toBe('');
		expect(workflowsStore.workflow.id).toBe(PLACEHOLDER_EMPTY_WORKFLOW_ID);
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
				onboardingFlowEnabled: false,
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
});
