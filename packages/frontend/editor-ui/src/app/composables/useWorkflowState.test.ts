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
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	let stateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
	let executionDataStore: ReturnType<typeof useExecutionDataStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('test-wf');
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

		describe('when activeExecutionId is null (pending scaffold)', () => {
			beforeEach(() => {
				// Reset to pending state instead of the string-id default from outer beforeEach.
				stateStore.setActiveExecutionId(undefined);
				stateStore.setPendingExecution(
					createTestWorkflowExecutionResponse({
						id: IN_PROGRESS_EXECUTION_ID,
						status: 'running',
					}),
				);
				// Re-set since promotePendingExecution would have moved it; emulate raw scaffold state.
				stateStore.setActiveExecutionId(null);

				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					createTestWorkflowExecutionResponse({
						id: IN_PROGRESS_EXECUTION_ID,
						status: 'running',
						data: createRunExecutionData({
							resultData: {
								runData: {
									node1: [
										createTestTaskData({ executionStatus: 'success' }),
										createTestTaskData({ executionStatus: 'error' }),
									],
								},
							},
						}),
					}),
				);
			});

			it('filters non-success runs in the IN_PROGRESS placeholder store', () => {
				workflowState.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date('2023-01-01T10:00:00Z'),
					stoppedAt: new Date('2023-01-01T10:05:00Z'),
					mode: 'manual',
				});

				const placeholder = useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID));
				expect(placeholder.execution?.data?.resultData?.runData?.node1).toHaveLength(1);
				expect(placeholder.execution?.data?.resultData?.runData?.node1[0].executionStatus).toBe(
					'success',
				);
				expect(placeholder.execution?.status).toBe('canceled');
			});

			it('mirrors stopData onto the pendingExecution ref', () => {
				workflowState.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date('2023-01-01T10:00:00Z'),
					stoppedAt: new Date('2023-01-01T10:05:00Z'),
					mode: 'manual',
				});

				expect(stateStore.pendingExecution?.status).toBe('canceled');
				expect(stateStore.pendingExecution?.startedAt).toEqual(new Date('2023-01-01T10:00:00Z'));
				expect(stateStore.pendingExecution?.stoppedAt).toEqual(new Date('2023-01-01T10:05:00Z'));
			});
		});

		describe('when activeExecutionId is undefined and displayedExecutionId is set', () => {
			beforeEach(() => {
				// Simulate post-stop-race: active was just cleared, but displayed still points
				// at the freshly-fetched finished execution.
				stateStore.setActiveExecutionId('display-exec');
				stateStore.setActiveExecutionId(undefined);
				expect(stateStore.activeExecutionId).toBeUndefined();
				expect(stateStore.displayedExecutionId).toBe('display-exec');

				useExecutionDataStore(createExecutionDataId('display-exec')).setExecution(
					createTestWorkflowExecutionResponse({
						id: 'display-exec',
						status: 'running',
						data: createRunExecutionData({
							resultData: {
								runData: {
									node1: [
										createTestTaskData({ executionStatus: 'success' }),
										createTestTaskData({ executionStatus: 'error' }),
									],
								},
							},
						}),
					}),
				);
			});

			it('falls back to displayedExecutionId for filtering and status update', () => {
				workflowState.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date('2023-01-01T10:00:00Z'),
					stoppedAt: new Date('2023-01-01T10:05:00Z'),
					mode: 'manual',
				});

				const ds = useExecutionDataStore(createExecutionDataId('display-exec'));
				expect(ds.execution?.data?.resultData?.runData?.node1).toHaveLength(1);
				expect(ds.execution?.data?.resultData?.runData?.node1[0].executionStatus).toBe('success');
				expect(ds.execution?.status).toBe('canceled');
			});
		});
	});

	describe('resetState', () => {
		it('disposes every executionData store this workflow ever bound, including rolled-out ids', () => {
			// Three sequential runs — exec-1 rolls out of previousExecutionId after run 3.
			stateStore.setActiveExecutionId('exec-1');
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-1' }),
			);
			stateStore.setActiveExecutionId('exec-2');
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-2' }),
			);
			stateStore.setActiveExecutionId('exec-3');
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-3' }),
			);

			workflowState.resetState();

			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('clears displayedExecutionId so workflowExecutionData reads as null', () => {
			stateStore.setActiveExecutionId('exec-A');
			useExecutionDataStore(createExecutionDataId('exec-A')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-A', finished: true, status: 'success' }),
			);
			// Simulate post-finish: active cleared, displayed preserved (the deliberate UX behavior).
			stateStore.setActiveExecutionId(undefined);
			expect(stateStore.displayedExecutionId).toBe('exec-A');
			expect(workflowsStore.workflowExecutionData?.id).toBe('exec-A');

			workflowState.resetState();

			const fresh = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('test-wf'));
			expect(fresh.displayedExecutionId).toBeUndefined();
			expect(fresh.activeExecutionId).toBeUndefined();
			expect(fresh.pendingExecution).toBeNull();
			expect(workflowsStore.workflowExecutionData).toBeNull();
		});

		it('disposes the IN_PROGRESS placeholder store along with the pending scaffold', () => {
			stateStore.setPendingExecution(
				createTestWorkflowExecutionResponse({
					id: IN_PROGRESS_EXECUTION_ID,
					status: 'running',
				}),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				createTestWorkflowExecutionResponse({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			workflowState.resetState();

			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});

		it('is a no-op (other than executingNode/builder reset) when no workflow is loaded', () => {
			workflowsStore.setWorkflowId('');

			expect(() => workflowState.resetState()).not.toThrow();
		});

		it('reopening the same workflow id after resetWorkspace order surfaces no stale state', () => {
			// Stage execution on test-wf
			stateStore.setActiveExecutionId('exec-A');
			useExecutionDataStore(createExecutionDataId('exec-A')).setExecution(
				createTestWorkflowExecutionResponse({ id: 'exec-A', finished: true, status: 'success' }),
			);
			stateStore.setActiveExecutionId(undefined);
			expect(workflowsStore.workflowExecutionData?.id).toBe('exec-A');

			// Mirror resetWorkspace ordering: resetState first (while workflowId is still set),
			// then resetWorkflow empties the id.
			workflowState.resetState();
			workflowsStore.resetWorkflow();
			expect(workflowsStore.workflowId).toBe('');

			// Reopen the same workflow id.
			workflowsStore.setWorkflowId('test-wf');

			// Fresh state — no leakage.
			const fresh = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('test-wf'));
			expect(fresh.activeExecutionId).toBeUndefined();
			expect(fresh.displayedExecutionId).toBeUndefined();
			expect(fresh.pendingExecution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-A')).execution).toBeNull();
			expect(workflowsStore.workflowExecutionData).toBeNull();
		});
	});
});
