import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import { createTestTaskData, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { createRunExecutionData } from 'n8n-workflow';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowState = useWorkflowState();
	});

	describe('markExecutionAsStopped', () => {
		beforeEach(() => {
			const workflowExecutionSessionStore = useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			);
			workflowExecutionSessionStore.setActiveExecutionId('exec-1');
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				createTestWorkflowExecutionResponse({
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

			const runData = useExecutionDataStore(createExecutionDataId('exec-1')).execution?.data
				?.resultData?.runData;
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

			const execution = useExecutionDataStore(createExecutionDataId('exec-1')).execution;

			expect(execution?.status).toBe('canceled');
			expect(execution?.startedAt).toEqual(new Date('2023-01-01T10:00:00Z'));
			expect(execution?.stoppedAt).toEqual(new Date('2023-01-01T10:05:00Z'));
		});

		it('should not update execution data when stopData is not provided', () => {
			workflowState.markExecutionAsStopped();

			const execution = useExecutionDataStore(createExecutionDataId('exec-1')).execution;

			expect(execution?.status).toBe('running');
			expect(execution?.startedAt).toEqual(new Date('2023-01-01T09:00:00Z'));
			expect(execution?.stoppedAt).toBeUndefined();
		});
	});
});
