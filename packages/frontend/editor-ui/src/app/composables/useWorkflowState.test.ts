import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import type { IWorkflowDb } from '@/Interface';
import { createRunExecutionData, type IPinData } from 'n8n-workflow';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowState = useWorkflowState();
	});

	describe('setWorkflowName()', () => {
		it('should set the workflow name correctly', () => {
			workflowState.setWorkflowName({
				newName: 'New Workflow Name',
				setStateDirty: false,
			});
			expect(workflowsStore.workflow.name).toBe('New Workflow Name');
		});

		it('should propagate name to workflowObject for pre-exec expressions', () => {
			workflowState.setWorkflowName({ newName: 'WF Title', setStateDirty: false });
			expect(workflowsStore.workflowObject.name).toBe('WF Title');
		});
	});

	describe('markExecutionAsStopped', () => {
		beforeEach(() => {
			workflowsStore.workflowExecutionData = createTestWorkflowExecutionResponse({
				status: 'running',
				startedAt: new Date('2023-01-01T09:00:00Z'),
				stoppedAt: undefined,
				data: createRunExecutionData({
					resultData: {
						runData: {
							node1: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'error' }),
								createTestTaskData({ executionStatus: 'running' }),
							],
							node2: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'waiting' }),
							],
						},
					},
				}),
			});
		});

		it('should remove non successful node runs', () => {
			workflowState.markExecutionAsStopped();

			const runData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
			expect(runData?.node1).toHaveLength(1);
			expect(runData?.node1[0].executionStatus).toBe('success');
			expect(runData?.node2).toHaveLength(1);
			expect(runData?.node2[0].executionStatus).toBe('success');
		});

		it('should update execution status, startedAt and stoppedAt when data is provided', () => {
			workflowState.markExecutionAsStopped({
				status: 'canceled',
				startedAt: new Date('2023-01-01T10:00:00Z'),
				stoppedAt: new Date('2023-01-01T10:05:00Z'),
				mode: 'manual',
			});

			expect(workflowsStore.workflowExecutionData?.status).toBe('canceled');
			expect(workflowsStore.workflowExecutionData?.startedAt).toEqual(
				new Date('2023-01-01T10:00:00Z'),
			);
			expect(workflowsStore.workflowExecutionData?.stoppedAt).toEqual(
				new Date('2023-01-01T10:05:00Z'),
			);
		});

		it('should not update execution data when stopData is not provided', () => {
			workflowState.markExecutionAsStopped();

			expect(workflowsStore.workflowExecutionData?.status).toBe('running');
			expect(workflowsStore.workflowExecutionData?.startedAt).toEqual(
				new Date('2023-01-01T09:00:00Z'),
			);
			expect(workflowsStore.workflowExecutionData?.stoppedAt).toBeUndefined();
		});
	});
	describe('setNodeParameters', () => {
		beforeEach(() => {
			workflowsStore.setNodes([createTestNode({ name: 'a', parameters: { p: 1, q: true } })]);
		});

		it('should set node parameters', () => {
			expect(workflowsStore.nodesByName.a.parameters).toEqual({ p: 1, q: true });

			workflowState.setNodeParameters({ name: 'a', value: { q: false, r: 's' } });

			expect(workflowsStore.nodesByName.a.parameters).toEqual({ q: false, r: 's' });
		});

		it('should set node parameters preserving existing ones if append=true', () => {
			expect(workflowsStore.nodesByName.a.parameters).toEqual({ p: 1, q: true });

			workflowState.setNodeParameters({ name: 'a', value: { q: false, r: 's' } }, true);

			expect(workflowsStore.nodesByName.a.parameters).toEqual({ p: 1, q: false, r: 's' });
		});

		it('should not update last parameter update time if parameters are set to the same value', () => {
			expect(workflowsStore.getParametersLastUpdate('a')).toEqual(undefined);

			workflowState.setNodeParameters({ name: 'a', value: { p: 1, q: true } });

			expect(workflowsStore.getParametersLastUpdate('a')).toEqual(undefined);
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

			workflowState.setNodeValue({ name: 'Edit Fields', key: 'executeOnce', value: true });

			expect(workflowsStore.workflow.nodes[0].executeOnce).toBe(true);
			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toEqual(
				expect.any(Number),
			);
		});
	});

	describe('setNodePositionById', () => {
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

			workflowState.setNodePositionById(nodeId, [0, 0]);

			expect(workflowsStore.workflow.nodes[0].position).toStrictEqual([0, 0]);
			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toBe(undefined);
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

			const result = workflowState.updateNodeAtIndex(nodeIndex, nodeData);

			expect(result).toBe(expectedResult);
			expect(workflowsStore.workflow.nodes).toEqual(expectedNodes);
		});

		it('should throw error if out of bounds', () => {
			workflowsStore.workflow.nodes = [];
			expect(() => workflowState.updateNodeAtIndex(0, { name: 'Updated Node' })).toThrowError();
		});
	});

	describe('pinned data', () => {
		it('sets workflow pin data', () => {
			workflowsStore.workflow.pinData = undefined;
			const data: IPinData = {
				TestNode: [{ json: { test: true } }],
				TestNode1: [{ json: { test: false } }],
			};
			workflowState.setWorkflowPinData(data);
			expect(workflowsStore.workflow.pinData).toEqual(data);
		});

		it('sets workflow pin data, adding json keys', () => {
			workflowsStore.workflow.pinData = undefined;
			const data = {
				TestNode: [{ test: true }],
				TestNode1: [{ test: false }],
			};
			workflowState.setWorkflowPinData(data as unknown as IPinData);
			expect(workflowsStore.workflow.pinData).toEqual({
				TestNode: [{ json: { test: true } }],
				TestNode1: [{ json: { test: false } }],
			});
		});
	});

	describe('updateNodeById', () => {
		beforeEach(() => {
			workflowsStore.setNodes([
				createTestNode({ id: 'node-1', name: 'First Node', parameters: { key: 'value1' } }),
				createTestNode({ id: 'node-2', name: 'Second Node', parameters: { key: 'value2' } }),
			]);
		});

		it('should update node by ID and return true', () => {
			const result = workflowState.updateNodeById('node-1', { name: 'Updated First Node' });

			expect(result).toBe(true);
			expect(workflowsStore.workflow.nodes[0].name).toBe('Updated First Node');
		});

		it('should return false if node ID is not found', () => {
			const result = workflowState.updateNodeById('non-existent-id', { name: 'Updated Node' });

			expect(result).toBe(false);
			// Nodes should remain unchanged
			expect(workflowsStore.workflow.nodes[0].name).toBe('First Node');
			expect(workflowsStore.workflow.nodes[1].name).toBe('Second Node');
		});

		it('should update only specified properties', () => {
			const result = workflowState.updateNodeById('node-2', {
				name: 'Updated Second Node',
				disabled: true,
			});

			expect(result).toBe(true);
			expect(workflowsStore.workflow.nodes[1].name).toBe('Updated Second Node');
			expect(workflowsStore.workflow.nodes[1].disabled).toBe(true);
			// Other properties should remain unchanged
			expect(workflowsStore.workflow.nodes[1].id).toBe('node-2');
		});

		it('should return false if node data is unchanged', () => {
			const result = workflowState.updateNodeById('node-1', { name: 'First Node' });

			expect(result).toBe(false);
		});
	});

	describe('resetParametersLastUpdatedAt', () => {
		it('should set parametersLastUpdatedAt on existing metadata', () => {
			const nodeName = 'Test Node';
			workflowsStore.addNode({
				parameters: {},
				id: 'test-node-id',
				name: nodeName,
				type: 'n8n-nodes-base.set',
				position: [0, 0],
				typeVersion: 1,
			});

			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toBeUndefined();

			workflowState.resetParametersLastUpdatedAt(nodeName);

			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toEqual(
				expect.any(Number),
			);
		});

		it('should create metadata if it does not exist', () => {
			const nodeName = 'New Node Without Metadata';
			// Node metadata doesn't exist yet
			expect(workflowsStore.nodeMetadata[nodeName]).toBeUndefined();

			workflowState.resetParametersLastUpdatedAt(nodeName);

			expect(workflowsStore.nodeMetadata[nodeName]).toBeDefined();
			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toEqual(
				expect.any(Number),
			);
		});

		it('should preserve existing metadata properties when updating', () => {
			const nodeName = 'Node With Existing Metadata';
			workflowsStore.nodeMetadata[nodeName] = {
				pristine: true,
			};

			workflowState.resetParametersLastUpdatedAt(nodeName);

			expect(workflowsStore.nodeMetadata[nodeName].pristine).toBe(true);
			expect(workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt).toEqual(
				expect.any(Number),
			);
		});
	});
});
