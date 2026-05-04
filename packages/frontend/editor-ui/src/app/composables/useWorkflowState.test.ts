import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';
import { createPinia, setActivePinia } from 'pinia';
import { createTestTaskData, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { createRunExecutionData } from 'n8n-workflow';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	beforeEach(() => {
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowState = useWorkflowState();
	});

	describe('setWorkflowExecutionData', () => {
		it('loads execution data as displayed data without marking it active', () => {
			const execution = createTestWorkflowExecutionResponse({
				id: 'exec-1',
				finished: true,
				status: 'success',
			});

			workflowState.setWorkflowExecutionData(execution);

			const workflowExecutionSession = useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			);
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));

			expect(executionDataStore.execution).toEqual(execution);
			expect(workflowExecutionSession.displayedExecutionId).toBe('exec-1');
			expect(workflowExecutionSession.activeExecutionId).toBeUndefined();
			expect(workflowsStore.workflowExecutionData).toEqual(execution);
			expect(workflowsStore.isWorkflowRunning).toBe(false);
			expect(workflowsStore.workflowExecutionPairedItemMappings).toEqual(
				executionDataStore.executionPairedItemMappings,
			);
		});

		it('clears the active execution data store when setting execution data to null', () => {
			const execution = createTestWorkflowExecutionResponse({ id: 'exec-1' });
			workflowState.setWorkflowExecutionData(execution);
			workflowState.setActiveExecutionId('exec-1');

			workflowState.setWorkflowExecutionData(null);

			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(workflowsStore.workflowExecutionData).toBeNull();
			expect(workflowsStore.workflowExecutionPairedItemMappings).toEqual({});
		});

		it('keeps an existing active execution id when refreshing visible running data', () => {
			const execution = createTestWorkflowExecutionResponse({
				id: 'exec-1',
				status: 'running',
				finished: false,
			});
			workflowState.setActiveExecutionId('exec-1');

			workflowState.setWorkflowExecutionData(execution);

			const workflowExecutionSession = useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			);
			expect(workflowExecutionSession.activeExecutionId).toBe('exec-1');
			expect(workflowExecutionSession.displayedExecutionId).toBe('exec-1');
			expect(workflowsStore.workflowExecutionData).toEqual(execution);
		});

		it('clears displayed execution data when setting execution data to null', () => {
			const execution = createTestWorkflowExecutionResponse({ id: 'exec-1' });
			workflowState.setWorkflowExecutionData(execution);
			workflowState.setActiveExecutionId(undefined);

			expect(workflowsStore.workflowExecutionData).toEqual(execution);

			workflowState.setWorkflowExecutionData(null);

			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toEqual(execution);
			expect(workflowsStore.workflowExecutionData).toBeNull();
			expect(workflowsStore.getWorkflowRunData).toBeNull();
			expect(workflowsStore.workflowExecutionPairedItemMappings).toEqual({});
		});
	});

	describe('markExecutionAsStopped', () => {
		function createRunningExecution(id = 'exec-1') {
			return createTestWorkflowExecutionResponse({
				id,
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
		}

		beforeEach(() => {
			workflowState.setWorkflowExecutionData(createRunningExecution());
			workflowState.setActiveExecutionId('exec-1');
		});

		it('should remove non successful node runs', () => {
			workflowState.markExecutionAsStopped();

			const runData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
			const executionRunData = useExecutionDataStore(
				createExecutionDataId('exec-1'),
			).executionRunData;
			expect(runData?.node1).toHaveLength(1);
			expect(runData?.node1[0].executionStatus).toBe('success');
			expect(runData?.node2).toHaveLength(1);
			expect(runData?.node2[0].executionStatus).toBe('success');
			expect(executionRunData?.node1).toHaveLength(1);
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
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution?.status).toBe(
				'canceled',
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

		it('should update pending execution when execution id is pending', () => {
			const workflowExecutionSession = useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			);

			workflowState.setWorkflowExecutionData(null);
			workflowState.setActiveExecutionId(null);
			workflowExecutionSession.setPendingExecution(createRunningExecution('pending-exec'));

			workflowState.markExecutionAsStopped({
				status: 'canceled',
				startedAt: new Date('2023-01-01T10:00:00Z'),
				stoppedAt: new Date('2023-01-01T10:05:00Z'),
				mode: 'manual',
			});

			const runData = workflowExecutionSession.pendingExecution?.data?.resultData.runData;
			expect(workflowExecutionSession.pendingExecution?.status).toBe('canceled');
			expect(workflowExecutionSession.pendingExecution?.startedAt).toEqual(
				new Date('2023-01-01T10:00:00Z'),
			);
			expect(workflowExecutionSession.pendingExecution?.stoppedAt).toEqual(
				new Date('2023-01-01T10:05:00Z'),
			);
			expect(runData?.node1).toHaveLength(1);
			expect(runData?.node2).toHaveLength(1);
		});

		it('preserves filtered run data for the waiting node when stopping', () => {
			const waitingExecution = createTestWorkflowExecutionResponse({
				id: 'exec-1',
				status: 'waiting',
				startedAt: new Date('2023-01-01T09:00:00Z'),
				stoppedAt: undefined,
				data: createRunExecutionData({
					waitTill: new Date('2023-01-02T00:00:00Z'),
					resultData: {
						lastNodeExecuted: 'node2',
						runData: {
							node1: [createTestTaskData({ executionStatus: 'success' })],
							node2: [
								createTestTaskData({ executionStatus: 'success' }),
								createTestTaskData({ executionStatus: 'waiting' }),
							],
						},
					},
				}),
			});
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(waitingExecution, { stripWaitingTaskData: false });
			workflowState.setActiveExecutionId('exec-1');

			workflowState.markExecutionAsStopped({
				status: 'canceled',
				startedAt: new Date('2023-01-01T10:00:00Z'),
				stoppedAt: new Date('2023-01-01T10:05:00Z'),
				mode: 'manual',
			});

			const runData = workflowsStore.workflowExecutionData?.data?.resultData?.runData;
			expect(runData?.node2).toHaveLength(1);
			expect(runData?.node2[0].executionStatus).toBe('success');
			expect(executionDataStore.executionRunData?.node2).toHaveLength(1);
			expect(executionDataStore.executionRunData?.node2[0].executionStatus).toBe('success');
			expect(executionDataStore.execution?.status).toBe('canceled');
		});

		it('should not promote displayed execution data when no execution is active', () => {
			const workflowExecutionSession = useWorkflowExecutionSessionStore(
				createWorkflowExecutionSessionId(workflowsStore.workflowId),
			);

			workflowState.setActiveExecutionId(undefined);

			workflowState.markExecutionAsStopped();

			const runData = workflowsStore.workflowExecutionData?.data?.resultData.runData;
			expect(workflowExecutionSession.pendingExecution).toBeNull();
			expect(runData?.node1).toHaveLength(3);
			expect(runData?.node2).toHaveLength(2);
		});
	});
});
