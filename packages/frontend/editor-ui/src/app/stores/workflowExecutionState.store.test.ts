/**
 * Tests for workflowExecutionState.store.
 *
 * Verifies the keyed-by-workflowId state store: tri-state activeExecutionId,
 * pendingExecution fallback, promotePendingExecution lifecycle, current
 * executions filter+dedupe, last-successful-execution via id reference,
 * dispose lifecycle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import {
	useWorkflowExecutionStateStore,
	getWorkflowExecutionStateStoreId,
	disposeWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useExecutionDataStore, createExecutionDataId } from '@/app/stores/executionData.store';
import { createTestTaskData, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { createRunExecutionData, type ExecutionSummary } from 'n8n-workflow';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

function makeExecution(overrides: Partial<IExecutionResponse> = {}): IExecutionResponse {
	return createTestWorkflowExecutionResponse({
		id: 'exec-1',
		finished: false,
		status: 'running',
		...overrides,
	});
}

function makeExecutionSummary(overrides: Partial<ExecutionSummary> = {}): ExecutionSummary {
	return {
		id: '1',
		workflowId: 'wf-1',
		mode: 'manual',
		status: 'success',
		createdAt: new Date(),
		startedAt: new Date(),
		...overrides,
	} as ExecutionSummary;
}

describe('workflowExecutionState.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('store identity', () => {
		it('uses a workflowId-scoped store id', () => {
			const id = createWorkflowDocumentId('wf-42');
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(id);
			expect(workflowExecutionStateStore.$id).toBe(getWorkflowExecutionStateStoreId(id));
			expect(workflowExecutionStateStore.documentId).toBe(id);
			expect(workflowExecutionStateStore.workflowId).toBe('wf-42');
		});

		it('different workflowIds produce isolated state stores', () => {
			const a = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-a'));
			const b = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-b'));

			a.setExecutionWaitingForWebhook(true);
			b.setIsInDebugMode(true);

			expect(a.executionWaitingForWebhook).toBe(true);
			expect(a.isInDebugMode).toBe(false);
			expect(b.executionWaitingForWebhook).toBe(false);
			expect(b.isInDebugMode).toBe(true);
		});
	});

	describe('activeExecutionId tri-state', () => {
		it('starts undefined', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			expect(workflowExecutionStateStore.activeExecutionId).toBeUndefined();
		});

		it('null indicates execution started but id pending', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId(null);
			expect(workflowExecutionStateStore.activeExecutionId).toBeNull();
		});

		it('string indicates known execution id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-1');
		});

		it('rolls activeExecutionId into previousExecutionId on transition to a new id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setActiveExecutionId('exec-2');
			expect(workflowExecutionStateStore.previousExecutionId).toBe('exec-1');
			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-2');
		});

		it('does not update previousExecutionId when clearing to undefined', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setActiveExecutionId(undefined);
			expect(workflowExecutionStateStore.previousExecutionId).toBeUndefined();
			expect(workflowExecutionStateStore.activeExecutionId).toBeUndefined();
		});

		it('setting a string id also sets displayedExecutionId', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			expect(workflowExecutionStateStore.displayedExecutionId).toBe('exec-1');
		});

		it('clearing activeExecutionId preserves displayedExecutionId', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setActiveExecutionId(undefined);
			expect(workflowExecutionStateStore.displayedExecutionId).toBe('exec-1');
		});
	});

	describe('setWorkflowExecutionData', () => {
		it('clears pending + displayed execution when given null', () => {
			const store = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			store.setActiveExecutionId('exec-1');
			store.setPendingExecution(makeExecution({ id: 'pending' }));

			store.setWorkflowExecutionData(null);

			expect(store.pendingExecution).toBeNull();
			expect(store.displayedExecutionId).toBeUndefined();
		});

		it('stages an in-progress execution as the pending scaffold', () => {
			const store = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const execution = makeExecution({ id: IN_PROGRESS_EXECUTION_ID });

			store.setWorkflowExecutionData(execution);

			expect(store.activeExecutionId).toBeNull();
			expect(store.pendingExecution?.id).toBe(IN_PROGRESS_EXECUTION_ID);
			const executionDataStore = useExecutionDataStore(
				createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
			);
			expect(executionDataStore.execution?.id).toBe(IN_PROGRESS_EXECUTION_ID);
		});

		it('tracks a finished execution as displayed when none is active', () => {
			const store = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const execution = makeExecution({ id: 'exec-9', status: 'success', finished: true });

			store.setWorkflowExecutionData(execution);

			expect(store.displayedExecutionId).toBe('exec-9');
			expect(store.activeExecutionId).toBeUndefined();
			expect(store.pendingExecution).toBeNull();
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-9'));
			expect(executionDataStore.execution?.id).toBe('exec-9');
		});

		it('leaves an active execution id untouched when finished data arrives', () => {
			const store = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			store.setActiveExecutionId('exec-active');

			store.setWorkflowExecutionData(makeExecution({ id: 'exec-9', finished: true }));

			expect(store.activeExecutionId).toBe('exec-active');
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-9'));
			expect(executionDataStore.execution?.id).toBe('exec-9');
		});
	});

	describe('markExecutionAsStopped', () => {
		const documentId = createWorkflowDocumentId('test-wf');
		let store: ReturnType<typeof useWorkflowExecutionStateStore>;
		let executionDataStore: ReturnType<typeof useExecutionDataStore>;

		beforeEach(() => {
			store = useWorkflowExecutionStateStore(documentId);
			store.setActiveExecutionId('test-exec-id');

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
			store.markExecutionAsStopped();

			const runData = executionDataStore.execution?.data?.resultData?.runData;
			expect(runData?.node1).toHaveLength(1);
			expect(runData?.node1[0].executionStatus).toBe('success');
			expect(runData?.node2).toHaveLength(1);
			expect(runData?.node2[0].executionStatus).toBe('success');
		});

		it('should update execution status, startedAt and stoppedAt when data is provided', () => {
			store.markExecutionAsStopped({
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
			store.markExecutionAsStopped();

			expect(executionDataStore.execution?.status).toBe('running');
			expect(executionDataStore.execution?.startedAt).toEqual(new Date('2023-01-01T09:00:00Z'));
			expect(executionDataStore.execution?.stoppedAt).toBeUndefined();
		});

		describe('when activeExecutionId is null (pending scaffold)', () => {
			beforeEach(() => {
				// Reset to pending state instead of the string-id default from outer beforeEach.
				store.setActiveExecutionId(undefined);
				store.setPendingExecution(
					createTestWorkflowExecutionResponse({
						id: IN_PROGRESS_EXECUTION_ID,
						status: 'running',
					}),
				);
				// Re-set since promotePendingExecution would have moved it; emulate raw scaffold state.
				store.setActiveExecutionId(null);

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
				store.markExecutionAsStopped({
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
				store.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date('2023-01-01T10:00:00Z'),
					stoppedAt: new Date('2023-01-01T10:05:00Z'),
					mode: 'manual',
				});

				expect(store.pendingExecution?.status).toBe('canceled');
				expect(store.pendingExecution?.startedAt).toEqual(new Date('2023-01-01T10:00:00Z'));
				expect(store.pendingExecution?.stoppedAt).toEqual(new Date('2023-01-01T10:05:00Z'));
			});
		});

		describe('when activeExecutionId is undefined and displayedExecutionId is set', () => {
			beforeEach(() => {
				// Simulate post-stop-race: active was just cleared, but displayed still points
				// at the freshly-fetched finished execution.
				store.setActiveExecutionId('display-exec');
				store.setActiveExecutionId(undefined);
				expect(store.activeExecutionId).toBeUndefined();
				expect(store.displayedExecutionId).toBe('display-exec');

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
				store.markExecutionAsStopped({
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

	describe('activeExecution routing', () => {
		it('returns pendingExecution when activeExecutionId === null', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const scaffold = makeExecution({ id: '__IN_PROGRESS__' });
			workflowExecutionStateStore.setPendingExecution(scaffold);
			workflowExecutionStateStore.setActiveExecutionId(null);

			expect(workflowExecutionStateStore.activeExecution?.id).toBe('__IN_PROGRESS__');
		});

		it('returns the executionData store entry when activeExecutionId is a string', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));

			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			expect(workflowExecutionStateStore.activeExecution?.id).toBe('exec-1');
		});

		it('falls back to displayed execution after active is cleared', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));

			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setActiveExecutionId(undefined);

			expect(workflowExecutionStateStore.activeExecution?.id).toBe('exec-1');
		});

		it('returns null when nothing is set', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			expect(workflowExecutionStateStore.activeExecution).toBeNull();
		});
	});

	describe('active-execution accessors (resolver tri-state)', () => {
		// The resolver is private but observable through any new getter that
		// proxies to the execution-data store. activeExecutionResultDataLastUpdate
		// is the cleanest probe because each setExecution() call writes a fresh
		// timestamp on the targeted data store and nothing else.
		describe('resolver fallback', () => {
			it('routes string activeExecutionId → that id', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-A')).setExecution(
					makeExecution({ id: 'exec-A' }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId('exec-A'),
				).executionResultDataLastUpdate;

				workflowExecutionStateStore.setActiveExecutionId('exec-A');

				expect(workflowExecutionStateStore.activeExecutionResultDataLastUpdate).toBe(expected);
			});

			it('routes null activeExecutionId → IN_PROGRESS sentinel', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
				).executionResultDataLastUpdate;

				workflowExecutionStateStore.setActiveExecutionId(null);

				expect(workflowExecutionStateStore.activeExecutionResultDataLastUpdate).toBe(expected);
			});

			it('routes undefined activeExecutionId with string displayedExecutionId → displayed id', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-D')).setExecution(
					makeExecution({ id: 'exec-D' }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId('exec-D'),
				).executionResultDataLastUpdate;

				workflowExecutionStateStore.setActiveExecutionId('exec-D');
				workflowExecutionStateStore.setActiveExecutionId(undefined);

				expect(workflowExecutionStateStore.activeExecutionId).toBeUndefined();
				expect(workflowExecutionStateStore.displayedExecutionId).toBe('exec-D');
				expect(workflowExecutionStateStore.activeExecutionResultDataLastUpdate).toBe(expected);
			});

			it('returns undefined when nothing is set', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(workflowExecutionStateStore.activeExecutionResultDataLastUpdate).toBeUndefined();
			});
		});

		describe('activeExecutionRunData', () => {
			it('proxies through the executionData store for the active id', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({
						id: 'exec-1',
						data: { resultData: { runData: { Trigger: [] } } } as never,
					}),
				);
				workflowExecutionStateStore.setActiveExecutionId('exec-1');

				expect(workflowExecutionStateStore.activeExecutionRunData).toEqual({ Trigger: [] });
			});

			it('falls back to IN_PROGRESS for null activeExecutionId', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({
						id: IN_PROGRESS_EXECUTION_ID,
						data: { resultData: { runData: { Pending: [] } } } as never,
					}),
				);
				workflowExecutionStateStore.setActiveExecutionId(null);

				expect(workflowExecutionStateStore.activeExecutionRunData).toEqual({ Pending: [] });
			});

			it('falls back to displayed id after active is cleared', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({
						id: 'exec-1',
						data: { resultData: { runData: { Displayed: [] } } } as never,
					}),
				);
				workflowExecutionStateStore.setActiveExecutionId('exec-1');
				workflowExecutionStateStore.setActiveExecutionId(undefined);

				expect(workflowExecutionStateStore.activeExecutionRunData).toEqual({ Displayed: [] });
			});

			it('returns null when no execution is tracked', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(workflowExecutionStateStore.activeExecutionRunData).toBeNull();
			});
		});

		describe('activeExecutionExecutedNode', () => {
			it('proxies the executedNode from the active executionData store', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({ id: 'exec-1', executedNode: 'Code' }),
				);
				workflowExecutionStateStore.setActiveExecutionId('exec-1');

				expect(workflowExecutionStateStore.activeExecutionExecutedNode).toBe('Code');
			});

			it('falls back to IN_PROGRESS for null activeExecutionId', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({ id: IN_PROGRESS_EXECUTION_ID, executedNode: 'Pending' }),
				);
				workflowExecutionStateStore.setActiveExecutionId(null);

				expect(workflowExecutionStateStore.activeExecutionExecutedNode).toBe('Pending');
			});

			it('falls back to displayed id after active is cleared', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({ id: 'exec-1', executedNode: 'Trigger' }),
				);
				workflowExecutionStateStore.setActiveExecutionId('exec-1');
				workflowExecutionStateStore.setActiveExecutionId(undefined);

				expect(workflowExecutionStateStore.activeExecutionExecutedNode).toBe('Trigger');
			});

			it('returns undefined when nothing is set', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(workflowExecutionStateStore.activeExecutionExecutedNode).toBeUndefined();
			});
		});

		describe('activeExecutionStartedData', () => {
			it('proxies executionStartedData for string activeExecutionId', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
				executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));
				executionDataStore.addNodeExecutionStartedData({
					executionId: 'exec-1',
					nodeName: 'Code',
					data: { startTime: 1 } as never,
				});
				workflowExecutionStateStore.setActiveExecutionId('exec-1');

				expect(workflowExecutionStateStore.activeExecutionStartedData?.[0]).toBe('exec-1');
				expect(workflowExecutionStateStore.activeExecutionStartedData?.[1].Code).toHaveLength(1);
			});

			it('falls back to IN_PROGRESS for null activeExecutionId', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				const executionDataStore = useExecutionDataStore(
					createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
				);
				executionDataStore.setExecution(makeExecution({ id: IN_PROGRESS_EXECUTION_ID }));
				executionDataStore.addNodeExecutionStartedData({
					executionId: IN_PROGRESS_EXECUTION_ID,
					nodeName: 'Pending',
					data: { startTime: 1 } as never,
				});
				workflowExecutionStateStore.setActiveExecutionId(null);

				expect(workflowExecutionStateStore.activeExecutionStartedData?.[0]).toBe(
					IN_PROGRESS_EXECUTION_ID,
				);
				expect(workflowExecutionStateStore.activeExecutionStartedData?.[1].Pending).toHaveLength(1);
			});

			it('returns undefined when nothing is set', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(workflowExecutionStateStore.activeExecutionStartedData).toBeUndefined();
			});
		});

		describe('activeExecutionPairedItemMappings', () => {
			it('proxies pairedItemMappings for string activeExecutionId', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({ id: 'exec-1' }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId('exec-1'),
				).executionPairedItemMappings;
				workflowExecutionStateStore.setActiveExecutionId('exec-1');

				expect(workflowExecutionStateStore.activeExecutionPairedItemMappings).toBe(expected);
			});

			it('returns empty object when no execution is tracked', () => {
				const workflowExecutionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(workflowExecutionStateStore.activeExecutionPairedItemMappings).toEqual({});
			});
		});
	});

	describe('setWorkflowExecutionData (execution-data store writes)', () => {
		it('null clears pending and displayed execution ids', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setPendingExecution(makeExecution());
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			workflowExecutionStateStore.setWorkflowExecutionData(null);

			expect(workflowExecutionStateStore.pendingExecution).toBeNull();
			expect(workflowExecutionStateStore.displayedExecutionId).toBeUndefined();
		});

		it('IN_PROGRESS payload stages pending + activeExecutionId=null + writes IN_PROGRESS data store', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const payload = makeExecution({ id: IN_PROGRESS_EXECUTION_ID, executedNode: 'Code' });

			workflowExecutionStateStore.setWorkflowExecutionData(payload);

			expect(workflowExecutionStateStore.activeExecutionId).toBeNull();
			expect(workflowExecutionStateStore.pendingExecution?.id).toBe(IN_PROGRESS_EXECUTION_ID);
			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution?.id,
			).toBe(IN_PROGRESS_EXECUTION_ID);
		});

		it('real id without prior active sets data store, clears pending, promotes displayed id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setPendingExecution(makeExecution());
			const exec = makeExecution({ id: 'exec-real' });

			workflowExecutionStateStore.setWorkflowExecutionData(exec);

			expect(useExecutionDataStore(createExecutionDataId('exec-real')).execution?.id).toBe(
				'exec-real',
			);
			expect(workflowExecutionStateStore.pendingExecution).toBeNull();
			expect(workflowExecutionStateStore.activeExecutionId).toBeUndefined();
			expect(workflowExecutionStateStore.displayedExecutionId).toBe('exec-real');
		});

		it('real id while activeExecutionId is already a string updates the data store only', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			const updated = makeExecution({ id: 'exec-1', executedNode: 'Code' });

			workflowExecutionStateStore.setWorkflowExecutionData(updated);

			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-1');
			expect(workflowExecutionStateStore.displayedExecutionId).toBe('exec-1');
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution?.executedNode).toBe(
				'Code',
			);
		});
	});

	describe('setActiveExecutionRunData / clearActiveExecutionStartedData / addActiveNodeExecutionStartedData', () => {
		it('setActiveExecutionRunData routes through the resolved id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			workflowExecutionStateStore.setActiveExecutionRunData({
				resultData: { runData: { Code: [] } },
			} as never);

			expect(
				useExecutionDataStore(createExecutionDataId('exec-1')).execution?.data?.resultData.runData,
			).toEqual({ Code: [] });
		});

		it('addActiveNodeExecutionStartedData routes through the resolved id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			workflowExecutionStateStore.addActiveNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'Code',
				data: { startTime: 1 } as never,
			});

			expect(
				useExecutionDataStore(createExecutionDataId('exec-1')).executionStartedData?.[1].Code,
			).toHaveLength(1);
		});

		it('clearActiveExecutionStartedData routes through the resolved id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));
			executionDataStore.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'Code',
				data: { startTime: 1 } as never,
			});
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			workflowExecutionStateStore.clearActiveExecutionStartedData();

			expect(executionDataStore.executionStartedData).toBeUndefined();
		});

		it('writes go nowhere when no execution is tracked', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			expect(() =>
				workflowExecutionStateStore.setActiveExecutionRunData({
					resultData: { runData: {} },
				} as never),
			).not.toThrow();
			expect(() => workflowExecutionStateStore.clearActiveExecutionStartedData()).not.toThrow();
			expect(() =>
				workflowExecutionStateStore.addActiveNodeExecutionStartedData({
					executionId: 'x',
					nodeName: 'N',
					data: { startTime: 1 } as never,
				}),
			).not.toThrow();
		});
	});

	describe('promotePendingExecution', () => {
		it('migrates the pending scaffold into a fresh executionData store and sets activeExecutionId', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				data: {
					resultData: { runData: { Trigger: [{ executionStatus: 'success' } as never] } },
				} as never,
			});
			workflowExecutionStateStore.setPendingExecution(scaffold);
			workflowExecutionStateStore.setActiveExecutionId(null);

			workflowExecutionStateStore.promotePendingExecution('exec-real');

			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-real');
			expect(workflowExecutionStateStore.pendingExecution).toBeNull();

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(executionDataStore.execution?.id).toBe('exec-real');
			expect(executionDataStore.execution?.data?.resultData.runData.Trigger).toBeDefined();
		});

		it('still sets activeExecutionId when no pending scaffold exists', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			workflowExecutionStateStore.promotePendingExecution('exec-real');

			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-real');
			expect(workflowExecutionStateStore.pendingExecution).toBeNull();
		});

		it('setActiveExecutionId(string) migrates a staged pending scaffold into the id-keyed store', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				executedNode: 'Code',
				data: {
					resultData: { runData: {} },
				} as never,
			});
			workflowExecutionStateStore.setPendingExecution(scaffold);
			workflowExecutionStateStore.setActiveExecutionId(null);

			workflowExecutionStateStore.setActiveExecutionId('exec-real');

			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-real');
			expect(workflowExecutionStateStore.pendingExecution).toBeNull();

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(executionDataStore.execution?.id).toBe('exec-real');
			expect(executionDataStore.execution?.executedNode).toBe('Code');
		});

		it('setActiveExecutionId(string) without a pending scaffold does not promote', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			workflowExecutionStateStore.setActiveExecutionId('exec-real');

			expect(workflowExecutionStateStore.activeExecutionId).toBe('exec-real');
			expect(workflowExecutionStateStore.pendingExecution).toBeNull();
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(executionDataStore.execution).toBeNull();
		});
	});

	describe('isWorkflowRunning', () => {
		it('is true when activeExecutionId is null (pending)', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId(null);
			expect(workflowExecutionStateStore.isWorkflowRunning).toBe(true);
		});

		it('is true when active execution is running and not finished', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'running', finished: false }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			expect(workflowExecutionStateStore.isWorkflowRunning).toBe(true);
		});

		it('is false when active execution is finished', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'success', finished: true }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			expect(workflowExecutionStateStore.isWorkflowRunning).toBe(false);
		});

		it('is false when no active execution is tracked', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			expect(workflowExecutionStateStore.isWorkflowRunning).toBe(false);
		});
	});

	describe('currentWorkflowExecutions', () => {
		it('addToCurrentExecutions filters by workflowId', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'other-wf' }),
			]);

			expect(workflowExecutionStateStore.currentWorkflowExecutions).toHaveLength(1);
			expect(workflowExecutionStateStore.currentWorkflowExecutions[0].id).toBe('1');
		});

		it('addToCurrentExecutions deduplicates by id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
			]);
			workflowExecutionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'wf-1' }),
			]);

			expect(workflowExecutionStateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual([
				'1',
				'2',
			]);
		});

		it('deleteExecution accepts both summary and id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const a = makeExecutionSummary({ id: '1', workflowId: 'wf-1' });
			const b = makeExecutionSummary({ id: '2', workflowId: 'wf-1' });
			workflowExecutionStateStore.setCurrentWorkflowExecutions([a, b]);

			workflowExecutionStateStore.deleteExecution(a);
			expect(workflowExecutionStateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['2']);

			workflowExecutionStateStore.deleteExecution('2');
			expect(workflowExecutionStateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('clearCurrentWorkflowExecutions empties the list', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			workflowExecutionStateStore.clearCurrentWorkflowExecutions();
			expect(workflowExecutionStateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('getAllLoadedFinishedExecutions filters by finished or stoppedAt', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setCurrentWorkflowExecutions([
				makeExecutionSummary({ id: '1', finished: true }),
				makeExecutionSummary({ id: '2', finished: false }),
				makeExecutionSummary({ id: '3', finished: false, stoppedAt: new Date() }),
			]);

			expect(
				workflowExecutionStateStore.getAllLoadedFinishedExecutions.map((e) => e.id).sort(),
			).toEqual(['1', '3']);
		});
	});

	describe('lastSuccessfulExecution', () => {
		it('stores execution as id reference and resolves through executionData store', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const exec = makeExecution({ id: 'last-1', status: 'success', finished: true });

			workflowExecutionStateStore.setLastSuccessfulExecution(exec);

			expect(workflowExecutionStateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(workflowExecutionStateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('is independent of active/displayed execution', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('active-1')).setExecution(
				makeExecution({ id: 'active-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('active-1');
			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));

			expect(workflowExecutionStateStore.activeExecutionId).toBe('active-1');
			expect(workflowExecutionStateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(workflowExecutionStateStore.activeExecution?.id).toBe('active-1');
			expect(workflowExecutionStateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('disposes the previous executionData store entry on replacement', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			const pinia = getActivePinia();
			const previousStoreId = useExecutionDataStore(createExecutionDataId('last-1')).$id;

			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-2' }));

			expect(pinia?.state.value[previousStoreId]).toBeUndefined();
			expect(workflowExecutionStateStore.lastSuccessfulExecution?.id).toBe('last-2');
		});

		it('clears via null', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			workflowExecutionStateStore.setLastSuccessfulExecution(null);
			expect(workflowExecutionStateStore.lastSuccessfulExecutionId).toBeNull();
			expect(workflowExecutionStateStore.lastSuccessfulExecution).toBeNull();
		});

		it('does not dispose the previous store when it is also the active execution', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			workflowExecutionStateStore.setActiveExecutionId('A');
			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(workflowExecutionStateStore.activeExecution?.id).toBe('A');
			expect(workflowExecutionStateStore.lastSuccessfulExecution?.id).toBe('B');
		});

		it('does not dispose the previous store when it is also the displayed execution', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			workflowExecutionStateStore.setActiveExecutionId('A');
			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			workflowExecutionStateStore.setActiveExecutionId(undefined);
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			workflowExecutionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(workflowExecutionStateStore.displayedExecutionId).toBe('A');
			expect(workflowExecutionStateStore.activeExecution?.id).toBe('A');
			expect(workflowExecutionStateStore.lastSuccessfulExecution?.id).toBe('B');
		});
	});

	describe('chat + trigger + flags', () => {
		it('appendChatMessage / resetChatMessages round-trip', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.appendChatMessage('hello');
			workflowExecutionStateStore.appendChatMessage('world');
			expect(workflowExecutionStateStore.chatMessages).toEqual(['hello', 'world']);
			expect(workflowExecutionStateStore.getPastChatMessages).toEqual(['hello', 'world']);
			workflowExecutionStateStore.resetChatMessages();
			expect(workflowExecutionStateStore.chatMessages).toEqual([]);
		});

		it('setSelectedTriggerNodeName updates the value', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setSelectedTriggerNodeName('TriggerA');
			expect(workflowExecutionStateStore.selectedTriggerNodeName).toBe('TriggerA');
			workflowExecutionStateStore.setSelectedTriggerNodeName(undefined);
			expect(workflowExecutionStateStore.selectedTriggerNodeName).toBeUndefined();
		});

		it('setExecutionWaitingForWebhook / setIsInDebugMode toggle flags', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setExecutionWaitingForWebhook(true);
			workflowExecutionStateStore.setIsInDebugMode(true);
			expect(workflowExecutionStateStore.executionWaitingForWebhook).toBe(true);
			expect(workflowExecutionStateStore.isInDebugMode).toBe(true);
		});

		it('setChatPartialExecutionDestinationNode round-trip', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setChatPartialExecutionDestinationNode('NodeA');
			expect(workflowExecutionStateStore.chatPartialExecutionDestinationNode).toBe('NodeA');
			workflowExecutionStateStore.setChatPartialExecutionDestinationNode(null);
			expect(workflowExecutionStateStore.chatPartialExecutionDestinationNode).toBeNull();
		});
	});

	describe('renameExecutionStateNode', () => {
		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setSelectedTriggerNodeName('Old');
			workflowExecutionStateStore.setChatPartialExecutionDestinationNode('Old');

			workflowExecutionStateStore.renameExecutionStateNode('Old', 'New');

			expect(workflowExecutionStateStore.selectedTriggerNodeName).toBe('New');
			expect(workflowExecutionStateStore.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('does nothing when names do not match', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setSelectedTriggerNodeName('A');
			workflowExecutionStateStore.setChatPartialExecutionDestinationNode('B');

			workflowExecutionStateStore.renameExecutionStateNode('Other', 'Renamed');

			expect(workflowExecutionStateStore.selectedTriggerNodeName).toBe('A');
			expect(workflowExecutionStateStore.chatPartialExecutionDestinationNode).toBe('B');
		});
	});

	describe('renameActiveExecutionNode (cross-store)', () => {
		it('renames runData keys on the resolved executionData store', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(
				makeExecution({
					id: 'exec-1',
					data: {
						resultData: {
							runData: { Old: [{ executionStatus: 'success' } as never] },
						},
					} as never,
				}),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			workflowExecutionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			const runData = executionDataStore.execution?.data?.resultData.runData;
			expect(runData?.New).toBeDefined();
			expect(runData?.Old).toBeUndefined();
		});

		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setSelectedTriggerNodeName('Old');
			workflowExecutionStateStore.setChatPartialExecutionDestinationNode('Old');

			workflowExecutionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(workflowExecutionStateStore.selectedTriggerNodeName).toBe('New');
			expect(workflowExecutionStateStore.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('marks UI state dirty and remaps uiStore.lastSelectedNode when it matches', async () => {
			const { useUIStore } = await import('@/app/stores/ui.store');
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Old';
			const markDirtySpy = vi.spyOn(uiStore, 'markStateDirty');

			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			workflowExecutionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(markDirtySpy).toHaveBeenCalled();
			expect(uiStore.lastSelectedNode).toBe('New');
		});

		it('leaves uiStore.lastSelectedNode untouched when it does not match', async () => {
			const { useUIStore } = await import('@/app/stores/ui.store');
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Untouched';

			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(uiStore.lastSelectedNode).toBe('Untouched');
		});

		it('routes through the displayedExecutionId when active is cleared', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(
				makeExecution({
					id: 'exec-1',
					data: { resultData: { runData: { Old: [] } } } as never,
				}),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setActiveExecutionId(undefined);

			workflowExecutionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(executionDataStore.execution?.data?.resultData.runData.New).toBeDefined();
		});
	});

	describe('resolveExecutionTriggerNodeName', () => {
		it('returns triggerNode from active execution', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					triggerNode: 'TriggerA',
					status: 'running',
					finished: false,
				}),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			expect(
				workflowExecutionStateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB']),
			).toBe('TriggerA');
		});

		it('falls back to runData keys for partial executions', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					status: 'running',
					finished: false,
					data: { resultData: { runData: { TriggerB: [] } } } as never,
				}),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');

			expect(
				workflowExecutionStateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB']),
			).toBe('TriggerB');
		});

		it('returns undefined when not running', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			expect(
				workflowExecutionStateStore.resolveExecutionTriggerNodeName(['TriggerA']),
			).toBeUndefined();
		});
	});

	describe('resetExecutionState', () => {
		it('clears every state field', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setPendingExecution(makeExecution());
			workflowExecutionStateStore.setExecutionWaitingForWebhook(true);
			workflowExecutionStateStore.setIsInDebugMode(true);
			workflowExecutionStateStore.appendChatMessage('hi');
			workflowExecutionStateStore.setChatPartialExecutionDestinationNode('Node');
			workflowExecutionStateStore.setSelectedTriggerNodeName('Trigger');
			workflowExecutionStateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			workflowExecutionStateStore.setLastSuccessfulExecutionId('last-1');
			workflowExecutionStateStore.executingNode.addExecutingNode('Node');

			workflowExecutionStateStore.resetExecutionState();

			expect(workflowExecutionStateStore.activeExecutionId).toBeUndefined();
			expect(workflowExecutionStateStore.displayedExecutionId).toBeUndefined();
			expect(workflowExecutionStateStore.previousExecutionId).toBeUndefined();
			expect(workflowExecutionStateStore.pendingExecution).toBeNull();
			expect(workflowExecutionStateStore.executionWaitingForWebhook).toBe(false);
			expect(workflowExecutionStateStore.isInDebugMode).toBe(false);
			expect(workflowExecutionStateStore.chatMessages).toEqual([]);
			expect(workflowExecutionStateStore.chatPartialExecutionDestinationNode).toBeNull();
			expect(workflowExecutionStateStore.selectedTriggerNodeName).toBeUndefined();
			expect(workflowExecutionStateStore.currentWorkflowExecutions).toEqual([]);
			expect(workflowExecutionStateStore.lastSuccessfulExecutionId).toBeNull();
			expect(workflowExecutionStateStore.executingNode.executingNode).toEqual([]);
			expect(workflowExecutionStateStore.executingNode.lastAddedExecutingNode).toBeNull();
		});

		it('disposes per-execution data stores for every tracked id', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			// Three sequential runs — exec-1 rolls out of previousExecutionId after exec-3.
			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-2');
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				makeExecution({ id: 'exec-2' }),
			);
			workflowExecutionStateStore.setActiveExecutionId('exec-3');
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				makeExecution({ id: 'exec-3' }),
			);

			workflowExecutionStateStore.resetExecutionState();

			// All three stores must be disposed — even exec-1 which is in no slot.
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('disposes the IN_PROGRESS placeholder store', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setPendingExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID, status: 'running' }),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			workflowExecutionStateStore.resetExecutionState();

			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});
	});

	describe('executingNode', () => {
		it('tracks the executing-node queue', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			workflowExecutionStateStore.executingNode.addExecutingNode('Node A');

			expect(workflowExecutionStateStore.executingNode.isNodeExecuting('Node A')).toBe(true);
			expect(workflowExecutionStateStore.executingNode.lastAddedExecutingNode).toBe('Node A');
		});

		it('isolates the executing-node queue per document id', () => {
			const a = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-a'));
			const b = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-b'));

			a.executingNode.addExecutingNode('Node A');

			expect(a.executingNode.isNodeExecuting('Node A')).toBe(true);
			expect(b.executingNode.isNodeExecuting('Node A')).toBe(false);
			expect(b.executingNode.executingNode).toEqual([]);
		});
	});

	describe('trackExecutionId', () => {
		it('tracks ids written via setActiveExecutionId across rolling runs', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);

			workflowExecutionStateStore.setActiveExecutionId('exec-1');
			workflowExecutionStateStore.setActiveExecutionId('exec-2');
			workflowExecutionStateStore.setActiveExecutionId('exec-3');

			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				makeExecution({ id: 'exec-2' }),
			);
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				makeExecution({ id: 'exec-3' }),
			);

			workflowExecutionStateStore.resetExecutionState();

			// All three are disposed even though exec-1 is in no slot after run 3.
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('tracks ids written via setLastSuccessfulExecution', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setLastSuccessfulExecution(
				makeExecution({ id: 'exec-success', finished: true, status: 'success' }),
			);

			workflowExecutionStateStore.resetExecutionState();

			expect(useExecutionDataStore(createExecutionDataId('exec-success')).execution).toBeNull();
		});

		it('does not track the IN_PROGRESS placeholder id (handled separately)', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.trackExecutionId(IN_PROGRESS_EXECUTION_ID);
			workflowExecutionStateStore.trackExecutionId('real-exec');

			useExecutionDataStore(createExecutionDataId('real-exec')).setExecution(
				makeExecution({ id: 'real-exec' }),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			workflowExecutionStateStore.resetExecutionState();

			// Both stores get disposed: real-exec via tracked set, IN_PROGRESS unconditionally.
			expect(useExecutionDataStore(createExecutionDataId('real-exec')).execution).toBeNull();
			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});

		it('ignores null and undefined ids', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.trackExecutionId(null);
			workflowExecutionStateStore.trackExecutionId(undefined);
			workflowExecutionStateStore.trackExecutionId('');

			// resetExecutionState must complete without error and produce no surprising side effects.
			expect(() => workflowExecutionStateStore.resetExecutionState()).not.toThrow();
		});
	});

	describe('event hook', () => {
		it('fires onWorkflowExecutionStateChange with workflowId and field discriminator', () => {
			const id = createWorkflowDocumentId('wf-1');
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(id);
			const spy = vi.fn();
			workflowExecutionStateStore.onWorkflowExecutionStateChange(spy);

			workflowExecutionStateStore.setExecutionWaitingForWebhook(true);

			expect(spy).toHaveBeenCalled();
			expect(spy.mock.calls[0][0]).toMatchObject({
				action: 'update',
				payload: { documentId: id, field: 'executionWaitingForWebhook' },
			});
		});

		it('emits a delete action when clearing pending execution', () => {
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId('wf-1'),
			);
			workflowExecutionStateStore.setPendingExecution(makeExecution());

			const spy = vi.fn();
			workflowExecutionStateStore.onWorkflowExecutionStateChange(spy);
			workflowExecutionStateStore.setPendingExecution(null);

			expect(spy.mock.calls.some((c) => c[0].action === 'delete')).toBe(true);
		});
	});

	describe('disposeWorkflowExecutionStateStore', () => {
		it('removes pinia state and recreate yields fresh state', () => {
			const id = 'wf-disposable';
			const workflowExecutionStateStore = useWorkflowExecutionStateStore(
				createWorkflowDocumentId(id),
			);
			const pinia = getActivePinia();
			const disposeSpy = vi.spyOn(workflowExecutionStateStore, '$dispose');

			workflowExecutionStateStore.setExecutionWaitingForWebhook(true);
			expect(pinia?.state.value[workflowExecutionStateStore.$id]).toBeDefined();

			disposeWorkflowExecutionStateStore(workflowExecutionStateStore);

			expect(disposeSpy).toHaveBeenCalledOnce();
			expect(pinia?.state.value[workflowExecutionStateStore.$id]).toBeUndefined();

			const recreated = useWorkflowExecutionStateStore(createWorkflowDocumentId(id));
			expect(recreated).not.toBe(workflowExecutionStateStore);
			expect(recreated.executionWaitingForWebhook).toBe(false);
		});
	});
});
