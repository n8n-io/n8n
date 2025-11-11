import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import type { IWorkflowDb } from '@/Interface';

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
				data: {
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
				},
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

	describe('nodeExecutionItemCounts', () => {
		describe('setNodeExecutionItemCount()', () => {
			it('should store item counts for a node', () => {
				const itemCounts = { main: [5, 3] };

				workflowState.setNodeExecutionItemCount('TestNode', itemCounts);

				expect(workflowState.nodeExecutionItemCounts.value['TestNode']).toEqual(itemCounts);
			});

			it('should store item counts for multiple connection types', () => {
				const itemCounts = {
					main: [10],
					ai_memory: [2, 4],
					ai_tool: [1],
				};

				workflowState.setNodeExecutionItemCount('AINode', itemCounts);

				expect(workflowState.nodeExecutionItemCounts.value['AINode']).toEqual(itemCounts);
			});

			it('should store empty object when no item counts provided', () => {
				workflowState.setNodeExecutionItemCount('EmptyNode', {});

				expect(workflowState.nodeExecutionItemCounts.value['EmptyNode']).toEqual({});
			});

			it('should overwrite existing item counts for the same node', () => {
				workflowState.setNodeExecutionItemCount('Node1', { main: [5] });
				expect(workflowState.nodeExecutionItemCounts.value['Node1']).toEqual({ main: [5] });

				workflowState.setNodeExecutionItemCount('Node1', { main: [10] });
				expect(workflowState.nodeExecutionItemCounts.value['Node1']).toEqual({ main: [10] });
			});

			it('should store item counts for multiple nodes independently', () => {
				workflowState.setNodeExecutionItemCount('Node1', { main: [5] });
				workflowState.setNodeExecutionItemCount('Node2', { main: [10] });
				workflowState.setNodeExecutionItemCount('Node3', { ai_tool: [2] });

				expect(workflowState.nodeExecutionItemCounts.value['Node1']).toEqual({ main: [5] });
				expect(workflowState.nodeExecutionItemCounts.value['Node2']).toEqual({ main: [10] });
				expect(workflowState.nodeExecutionItemCounts.value['Node3']).toEqual({ ai_tool: [2] });
			});
		});

		describe('clearNodeExecutionItemCounts()', () => {
			it('should clear all stored item counts', () => {
				workflowState.setNodeExecutionItemCount('Node1', { main: [5] });
				workflowState.setNodeExecutionItemCount('Node2', { main: [10] });

				expect(Object.keys(workflowState.nodeExecutionItemCounts.value)).toHaveLength(2);

				workflowState.clearNodeExecutionItemCounts();

				expect(workflowState.nodeExecutionItemCounts.value).toEqual({});
			});

			it('should be safe to call when no item counts exist', () => {
				expect(workflowState.nodeExecutionItemCounts.value).toEqual({});

				workflowState.clearNodeExecutionItemCounts();

				expect(workflowState.nodeExecutionItemCounts.value).toEqual({});
			});
		});

		describe('integration with resetState()', () => {
			it('should clear item counts when resetting state', () => {
				workflowState.setNodeExecutionItemCount('Node1', { main: [5] });
				workflowState.setNodeExecutionItemCount('Node2', { main: [10] });

				expect(Object.keys(workflowState.nodeExecutionItemCounts.value)).toHaveLength(2);

				workflowState.resetState();

				expect(workflowState.nodeExecutionItemCounts.value).toEqual({});
			});
		});

		describe('integration with markExecutionAsStopped()', () => {
			beforeEach(() => {
				workflowsStore.workflowExecutionData = createTestWorkflowExecutionResponse({
					status: 'running',
					data: {
						resultData: {
							runData: {
								node1: [createTestTaskData({ executionStatus: 'success' })],
							},
						},
					},
				});
			});

			it('should clear item counts when execution is stopped', () => {
				workflowState.setNodeExecutionItemCount('Node1', { main: [5] });
				workflowState.setNodeExecutionItemCount('Node2', { main: [10] });

				expect(Object.keys(workflowState.nodeExecutionItemCounts.value)).toHaveLength(2);

				workflowState.markExecutionAsStopped();

				expect(workflowState.nodeExecutionItemCounts.value).toEqual({});
			});

			it('should clear item counts when execution is stopped with stopData', () => {
				workflowState.setNodeExecutionItemCount('Node1', { main: [5] });

				workflowState.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date(),
					stoppedAt: new Date(),
					mode: 'manual',
				});

				expect(workflowState.nodeExecutionItemCounts.value).toEqual({});
			});
		});
	});
});
