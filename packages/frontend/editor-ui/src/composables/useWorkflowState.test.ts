import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

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
});
