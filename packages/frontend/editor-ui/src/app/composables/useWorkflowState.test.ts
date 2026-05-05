import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import { createTestTaskData, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { createRunExecutionData } from 'n8n-workflow';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	let stateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
	let executionDataStore: ReturnType<typeof useExecutionDataStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsStore.workflow.id = 'test-wf';
		workflowState = useWorkflowState();

		stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('test-wf'));
	});

	describe('markExecutionAsStopped', () => {
		beforeEach(() => {
			// Set up active execution in the facade stores
			stateStore.setActiveExecutionId('test-exec-id');

			executionDataStore = useExecutionDataStore(createExecutionDataId('test-exec-id'));
			executionDataStore.setExecution(
				createTestWorkflowExecutionResponse({
					id: 'test-exec-id',
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
				}),
			);
		});

		it('should remove non successful node runs', () => {
			workflowState.markExecutionAsStopped();

			const runData = executionDataStore.execution?.data?.resultData?.runData;
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

			expect(executionDataStore.execution?.status).toBe('canceled');
			expect(executionDataStore.execution?.startedAt).toEqual(new Date('2023-01-01T10:00:00Z'));
			expect(executionDataStore.execution?.stoppedAt).toEqual(new Date('2023-01-01T10:05:00Z'));
		});

		it('should not update execution data when stopData is not provided', () => {
			workflowState.markExecutionAsStopped();

			expect(executionDataStore.execution?.status).toBe('running');
			expect(executionDataStore.execution?.startedAt).toEqual(new Date('2023-01-01T09:00:00Z'));
			expect(executionDataStore.execution?.stoppedAt).toBeUndefined();
		});
	});
});
