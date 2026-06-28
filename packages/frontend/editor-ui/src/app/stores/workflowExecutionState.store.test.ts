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
import { defineComponent, provide, shallowRef } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowExecutionStateStore,
	getWorkflowExecutionStateStoreId,
	disposeWorkflowExecutionStateStore,
	injectWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useExecutionDataStore, createExecutionDataId } from '@/app/stores/executionData.store';
import { createTestTaskData, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import {
	createRunExecutionData,
	TRIMMED_TASK_DATA_CONNECTIONS_KEY,
	type ExecutionSummary,
} from 'n8n-workflow';
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
			const executionStateStore = useWorkflowExecutionStateStore(id);
			expect(executionStateStore.$id).toBe(getWorkflowExecutionStateStoreId(id));
			expect(executionStateStore.documentId).toBe(id);
			expect(executionStateStore.workflowId).toBe('wf-42');
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
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			expect(executionStateStore.activeExecutionId).toBeUndefined();
		});

		it('null indicates execution started but id pending', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId(null);
			expect(executionStateStore.activeExecutionId).toBeNull();
		});

		it('string indicates known execution id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.activeExecutionId).toBe('exec-1');
		});

		it('rolls activeExecutionId into previousExecutionId on transition to a new id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId('exec-2');
			expect(executionStateStore.previousExecutionId).toBe('exec-1');
			expect(executionStateStore.activeExecutionId).toBe('exec-2');
		});

		it('does not update previousExecutionId when clearing to undefined', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);
			expect(executionStateStore.previousExecutionId).toBeUndefined();
			expect(executionStateStore.activeExecutionId).toBeUndefined();
		});

		it('setting a string id also sets displayedExecutionId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.displayedExecutionId).toBe('exec-1');
		});

		it('clearing activeExecutionId preserves displayedExecutionId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);
			expect(executionStateStore.displayedExecutionId).toBe('exec-1');
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

		it('records the stopped execution id when local run data has trimmed placeholders', () => {
			executionDataStore.setExecution(
				createTestWorkflowExecutionResponse({
					id: 'test-exec-id',
					status: 'running',
					data: createRunExecutionData({
						resultData: {
							runData: {
								node1: [
									createTestTaskData({
										executionStatus: 'success',
										data: { main: [[{ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }]] },
									}),
								],
							},
						},
					}),
				}),
			);

			store.markExecutionAsStopped();

			expect(store.stoppedExecutionId).toBe('test-exec-id');
			expect(store.activeExecutionId).toBeUndefined();
		});

		it('does not record the stopped execution id when local run data is complete', () => {
			store.markExecutionAsStopped();

			expect(store.stoppedExecutionId).toBeNull();
			expect(store.activeExecutionId).toBeUndefined();
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

			it('does not record a stopped execution id (no backend id to match a push against)', () => {
				store.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date('2023-01-01T10:00:00Z'),
					stoppedAt: new Date('2023-01-01T10:05:00Z'),
					mode: 'manual',
				});

				expect(store.stoppedExecutionId).toBeNull();
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

			it('does not record a stopped execution id (the finish was already handled)', () => {
				store.markExecutionAsStopped({
					status: 'canceled',
					startedAt: new Date('2023-01-01T10:00:00Z'),
					stoppedAt: new Date('2023-01-01T10:05:00Z'),
					mode: 'manual',
				});

				expect(store.stoppedExecutionId).toBeNull();
			});
		});
	});

	describe('stoppedExecutionId', () => {
		const documentId = createWorkflowDocumentId('test-wf');
		let store: ReturnType<typeof useWorkflowExecutionStateStore>;

		beforeEach(() => {
			store = useWorkflowExecutionStateStore(documentId);
			store.setActiveExecutionId('stopped-exec');
			// Marker is only set when the local run data is incomplete, so seed a
			// trimmed placeholder item.
			useExecutionDataStore(createExecutionDataId('stopped-exec')).setExecution(
				createTestWorkflowExecutionResponse({
					id: 'stopped-exec',
					status: 'running',
					data: createRunExecutionData({
						resultData: {
							runData: {
								node1: [
									createTestTaskData({
										executionStatus: 'success',
										data: { main: [[{ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }]] },
									}),
								],
							},
						},
					}),
				}),
			);
			store.markExecutionAsStopped();
			expect(store.stoppedExecutionId).toBe('stopped-exec');
		});

		it('is preserved when the active id is cleared to undefined', () => {
			store.setActiveExecutionId(undefined);

			expect(store.stoppedExecutionId).toBe('stopped-exec');
		});

		it('is cleared when a new run starts tracking (pending)', () => {
			store.setActiveExecutionId(null);

			expect(store.stoppedExecutionId).toBeNull();
		});

		it('is cleared when a new run starts tracking (known id)', () => {
			store.setActiveExecutionId('new-exec');

			expect(store.stoppedExecutionId).toBeNull();
		});

		it('is cleared by clearStoppedExecutionId', () => {
			store.clearStoppedExecutionId();

			expect(store.stoppedExecutionId).toBeNull();
		});

		it('is cleared by resetExecutionState', () => {
			store.resetExecutionState();

			expect(store.stoppedExecutionId).toBeNull();
		});
	});

	describe('activeExecution routing', () => {
		it('returns pendingExecution when activeExecutionId === null', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const scaffold = makeExecution({ id: '__IN_PROGRESS__' });
			executionStateStore.setPendingExecution(scaffold);
			executionStateStore.setActiveExecutionId(null);

			expect(executionStateStore.activeExecution?.id).toBe('__IN_PROGRESS__');
		});

		it('returns the executionData store entry when activeExecutionId is a string', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));

			executionStateStore.setActiveExecutionId('exec-1');

			expect(executionStateStore.activeExecution?.id).toBe('exec-1');
		});

		it('falls back to displayed execution after active is cleared', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));

			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);

			expect(executionStateStore.activeExecution?.id).toBe('exec-1');
		});

		it('returns null when nothing is set', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			expect(executionStateStore.activeExecution).toBeNull();
		});
	});

	describe('active-execution accessors (resolver tri-state)', () => {
		// The resolver is private but observable through any new getter that
		// proxies to the execution-data store. activeExecutionResultDataLastUpdate
		// is the cleanest probe because each setExecution() call writes a fresh
		// timestamp on the targeted data store and nothing else.
		describe('resolver fallback', () => {
			it('routes string activeExecutionId → that id', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-A')).setExecution(
					makeExecution({ id: 'exec-A' }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId('exec-A'),
				).executionResultDataLastUpdate;

				executionStateStore.setActiveExecutionId('exec-A');

				expect(executionStateStore.activeExecutionResultDataLastUpdate).toBe(expected);
			});

			it('routes null activeExecutionId → IN_PROGRESS sentinel', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
				).executionResultDataLastUpdate;

				executionStateStore.setActiveExecutionId(null);

				expect(executionStateStore.activeExecutionResultDataLastUpdate).toBe(expected);
			});

			it('routes undefined activeExecutionId with string displayedExecutionId → displayed id', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-D')).setExecution(
					makeExecution({ id: 'exec-D' }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId('exec-D'),
				).executionResultDataLastUpdate;

				executionStateStore.setActiveExecutionId('exec-D');
				executionStateStore.setActiveExecutionId(undefined);

				expect(executionStateStore.activeExecutionId).toBeUndefined();
				expect(executionStateStore.displayedExecutionId).toBe('exec-D');
				expect(executionStateStore.activeExecutionResultDataLastUpdate).toBe(expected);
			});

			it('returns undefined when nothing is set', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(executionStateStore.activeExecutionResultDataLastUpdate).toBeUndefined();
			});
		});

		describe('activeExecutionRunData', () => {
			it('proxies through the executionData store for the active id', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({
						id: 'exec-1',
						data: { resultData: { runData: { Trigger: [] } } } as never,
					}),
				);
				executionStateStore.setActiveExecutionId('exec-1');

				expect(executionStateStore.activeExecutionRunData).toEqual({ Trigger: [] });
			});

			it('falls back to IN_PROGRESS for null activeExecutionId', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({
						id: IN_PROGRESS_EXECUTION_ID,
						data: { resultData: { runData: { Pending: [] } } } as never,
					}),
				);
				executionStateStore.setActiveExecutionId(null);

				expect(executionStateStore.activeExecutionRunData).toEqual({ Pending: [] });
			});

			it('falls back to displayed id after active is cleared', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({
						id: 'exec-1',
						data: { resultData: { runData: { Displayed: [] } } } as never,
					}),
				);
				executionStateStore.setActiveExecutionId('exec-1');
				executionStateStore.setActiveExecutionId(undefined);

				expect(executionStateStore.activeExecutionRunData).toEqual({ Displayed: [] });
			});

			it('returns null when no execution is tracked', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(executionStateStore.activeExecutionRunData).toBeNull();
			});
		});

		describe('activeExecutionPinDataByNodeName', () => {
			it('does not treat a displayed execution as preview pin data in debug mode', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				const execution = makeExecution({
					id: 'exec-1',
					data: createRunExecutionData({
						resultData: {
							runData: {},
							pinData: { 'HTTP Request': [{ json: { source: 'workflow-pin-data' } }] },
						},
					}),
				});

				executionStateStore.setWorkflowExecutionData(execution);
				expect(executionStateStore.isExecutionDataDisplayed).toBe(true);

				executionStateStore.setIsInDebugMode(true);

				expect(executionStateStore.displayedExecutionId).toBe('exec-1');
				expect(executionStateStore.isExecutionDataDisplayed).toBe(false);
				expect(executionStateStore.activeExecutionPinDataByNodeName).toEqual({
					'HTTP Request': [{ json: { source: 'workflow-pin-data' } }],
				});
			});

			it('uses the in-progress execution pin data while a new execution id is pending', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('previous-exec')).setExecution(
					makeExecution({
						id: 'previous-exec',
						data: createRunExecutionData({
							resultData: {
								runData: {},
								pinData: { 'Send Rain Alert': [{ json: { stale: true } }] },
							},
						}),
					}),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({
						id: IN_PROGRESS_EXECUTION_ID,
						data: createRunExecutionData({
							resultData: {
								runData: {},
								pinData: { 'Get Berlin Forecast': [{ json: { dryRun: true } }] },
							},
						}),
					}),
				);

				executionStateStore.setActiveExecutionId('previous-exec');
				executionStateStore.setActiveExecutionId(undefined);
				executionStateStore.setActiveExecutionId(null);

				expect(executionStateStore.displayedExecutionId).toBe('previous-exec');
				expect(executionStateStore.activeExecutionPinDataByNodeName).toEqual({
					'Get Berlin Forecast': [{ json: { dryRun: true } }],
				});
				expect(
					executionStateStore.activeExecutionPinDataByNodeName['Send Rain Alert'],
				).toBeUndefined();
			});
		});

		describe('activeExecutionExecutedNode', () => {
			it('proxies the executedNode from the active executionData store', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({ id: 'exec-1', executedNode: 'Code' }),
				);
				executionStateStore.setActiveExecutionId('exec-1');

				expect(executionStateStore.activeExecutionExecutedNode).toBe('Code');
			});

			it('falls back to IN_PROGRESS for null activeExecutionId', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
					makeExecution({ id: IN_PROGRESS_EXECUTION_ID, executedNode: 'Pending' }),
				);
				executionStateStore.setActiveExecutionId(null);

				expect(executionStateStore.activeExecutionExecutedNode).toBe('Pending');
			});

			it('falls back to displayed id after active is cleared', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({ id: 'exec-1', executedNode: 'Trigger' }),
				);
				executionStateStore.setActiveExecutionId('exec-1');
				executionStateStore.setActiveExecutionId(undefined);

				expect(executionStateStore.activeExecutionExecutedNode).toBe('Trigger');
			});

			it('returns undefined when nothing is set', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(executionStateStore.activeExecutionExecutedNode).toBeUndefined();
			});
		});

		describe('activeExecutionStartedData', () => {
			it('proxies executionStartedData for string activeExecutionId', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
				executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));
				executionDataStore.addNodeExecutionStartedData({
					executionId: 'exec-1',
					nodeName: 'Code',
					data: { startTime: 1 } as never,
				});
				executionStateStore.setActiveExecutionId('exec-1');

				expect(executionStateStore.activeExecutionStartedData?.[0]).toBe('exec-1');
				expect(executionStateStore.activeExecutionStartedData?.[1].Code).toHaveLength(1);
			});

			it('falls back to IN_PROGRESS for null activeExecutionId', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
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
				executionStateStore.setActiveExecutionId(null);

				expect(executionStateStore.activeExecutionStartedData?.[0]).toBe(IN_PROGRESS_EXECUTION_ID);
				expect(executionStateStore.activeExecutionStartedData?.[1].Pending).toHaveLength(1);
			});

			it('returns undefined when nothing is set', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(executionStateStore.activeExecutionStartedData).toBeUndefined();
			});
		});

		describe('activeExecutionPairedItemMappings', () => {
			it('proxies pairedItemMappings for string activeExecutionId', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
					makeExecution({ id: 'exec-1' }),
				);
				const expected = useExecutionDataStore(
					createExecutionDataId('exec-1'),
				).executionPairedItemMappings;
				executionStateStore.setActiveExecutionId('exec-1');

				expect(executionStateStore.activeExecutionPairedItemMappings).toBe(expected);
			});

			it('returns empty object when no execution is tracked', () => {
				const executionStateStore = useWorkflowExecutionStateStore(
					createWorkflowDocumentId('wf-1'),
				);
				expect(executionStateStore.activeExecutionPairedItemMappings).toEqual({});
			});
		});
	});

	describe('setWorkflowExecutionData (execution-data store writes)', () => {
		it('null clears pending and displayed execution ids', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setPendingExecution(makeExecution());
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			executionStateStore.setWorkflowExecutionData(null);

			expect(executionStateStore.pendingExecution).toBeNull();
			expect(executionStateStore.displayedExecutionId).toBeUndefined();
		});

		it('IN_PROGRESS payload stages pending + activeExecutionId=null + writes IN_PROGRESS data store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const payload = makeExecution({ id: IN_PROGRESS_EXECUTION_ID, executedNode: 'Code' });

			executionStateStore.setWorkflowExecutionData(payload);

			expect(executionStateStore.activeExecutionId).toBeNull();
			expect(executionStateStore.pendingExecution?.id).toBe(IN_PROGRESS_EXECUTION_ID);
			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution?.id,
			).toBe(IN_PROGRESS_EXECUTION_ID);
		});

		it('real id without prior active sets data store, clears pending, promotes displayed id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setPendingExecution(makeExecution());
			const exec = makeExecution({ id: 'exec-real' });

			executionStateStore.setWorkflowExecutionData(exec);

			expect(useExecutionDataStore(createExecutionDataId('exec-real')).execution?.id).toBe(
				'exec-real',
			);
			expect(executionStateStore.pendingExecution).toBeNull();
			expect(executionStateStore.activeExecutionId).toBeUndefined();
			expect(executionStateStore.displayedExecutionId).toBe('exec-real');
		});

		it('real id while activeExecutionId is already a string updates the data store only', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			const updated = makeExecution({ id: 'exec-1', executedNode: 'Code' });

			executionStateStore.setWorkflowExecutionData(updated);

			expect(executionStateStore.activeExecutionId).toBe('exec-1');
			expect(executionStateStore.displayedExecutionId).toBe('exec-1');
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution?.executedNode).toBe(
				'Code',
			);
		});
	});

	describe('setActiveExecutionRunData / clearActiveExecutionStartedData / addActiveNodeExecutionStartedData', () => {
		it('setActiveExecutionRunData routes through the resolved id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			executionStateStore.setActiveExecutionRunData({
				resultData: { runData: { Code: [] } },
			} as never);

			expect(
				useExecutionDataStore(createExecutionDataId('exec-1')).execution?.data?.resultData.runData,
			).toEqual({ Code: [] });
		});

		it('addActiveNodeExecutionStartedData routes through the resolved id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			executionStateStore.addActiveNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'Code',
				data: { startTime: 1 } as never,
			});

			expect(
				useExecutionDataStore(createExecutionDataId('exec-1')).executionStartedData?.[1].Code,
			).toHaveLength(1);
		});

		it('clearActiveExecutionStartedData routes through the resolved id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(makeExecution({ id: 'exec-1' }));
			executionDataStore.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'Code',
				data: { startTime: 1 } as never,
			});
			executionStateStore.setActiveExecutionId('exec-1');

			executionStateStore.clearActiveExecutionStartedData();

			expect(executionDataStore.executionStartedData).toBeUndefined();
		});

		it('writes go nowhere when no execution is tracked', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

			expect(() =>
				executionStateStore.setActiveExecutionRunData({
					resultData: { runData: {} },
				} as never),
			).not.toThrow();
			expect(() => executionStateStore.clearActiveExecutionStartedData()).not.toThrow();
			expect(() =>
				executionStateStore.addActiveNodeExecutionStartedData({
					executionId: 'x',
					nodeName: 'N',
					data: { startTime: 1 } as never,
				}),
			).not.toThrow();
		});
	});

	describe('promotePendingExecution', () => {
		it('migrates the pending scaffold into a fresh executionData store and sets activeExecutionId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				data: {
					resultData: { runData: { Trigger: [{ executionStatus: 'success' } as never] } },
				} as never,
			});
			executionStateStore.setPendingExecution(scaffold);
			executionStateStore.setActiveExecutionId(null);

			executionStateStore.promotePendingExecution('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(executionDataStore.execution?.id).toBe('exec-real');
			expect(executionDataStore.execution?.data?.resultData.runData.Trigger).toBeDefined();
		});

		it('still sets activeExecutionId when no pending scaffold exists', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

			executionStateStore.promotePendingExecution('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();
		});

		it('setActiveExecutionId(string) migrates a staged pending scaffold into the id-keyed store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const scaffold = makeExecution({
				id: '__IN_PROGRESS__',
				executedNode: 'Code',
				data: {
					resultData: { runData: {} },
				} as never,
			});
			executionStateStore.setPendingExecution(scaffold);
			executionStateStore.setActiveExecutionId(null);

			executionStateStore.setActiveExecutionId('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(executionDataStore.execution?.id).toBe('exec-real');
			expect(executionDataStore.execution?.executedNode).toBe('Code');
		});

		it('setActiveExecutionId(string) without a pending scaffold does not promote', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

			executionStateStore.setActiveExecutionId('exec-real');

			expect(executionStateStore.activeExecutionId).toBe('exec-real');
			expect(executionStateStore.pendingExecution).toBeNull();
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-real'));
			expect(executionDataStore.execution).toBeNull();
		});
	});

	describe('isWorkflowRunning', () => {
		it('is true when activeExecutionId is null (pending)', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId(null);
			expect(executionStateStore.isWorkflowRunning).toBe(true);
		});

		it('is true when active execution is running and not finished', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'running', finished: false }),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.isWorkflowRunning).toBe(true);
		});

		it('is false when active execution is finished', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1', status: 'success', finished: true }),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			expect(executionStateStore.isWorkflowRunning).toBe(false);
		});

		it('is false when no active execution is tracked', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			expect(executionStateStore.isWorkflowRunning).toBe(false);
		});
	});

	describe('currentWorkflowExecutions', () => {
		it('addToCurrentExecutions filters by workflowId', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'other-wf' }),
			]);

			expect(executionStateStore.currentWorkflowExecutions).toHaveLength(1);
			expect(executionStateStore.currentWorkflowExecutions[0].id).toBe('1');
		});

		it('addToCurrentExecutions deduplicates by id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
			]);
			executionStateStore.addToCurrentExecutions([
				makeExecutionSummary({ id: '1', workflowId: 'wf-1' }),
				makeExecutionSummary({ id: '2', workflowId: 'wf-1' }),
			]);

			expect(executionStateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['1', '2']);
		});

		it('deleteExecution accepts both summary and id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const a = makeExecutionSummary({ id: '1', workflowId: 'wf-1' });
			const b = makeExecutionSummary({ id: '2', workflowId: 'wf-1' });
			executionStateStore.setCurrentWorkflowExecutions([a, b]);

			executionStateStore.deleteExecution(a);
			expect(executionStateStore.currentWorkflowExecutions.map((e) => e.id)).toEqual(['2']);

			executionStateStore.deleteExecution('2');
			expect(executionStateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('clearCurrentWorkflowExecutions empties the list', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			executionStateStore.clearCurrentWorkflowExecutions();
			expect(executionStateStore.currentWorkflowExecutions).toEqual([]);
		});

		it('getAllLoadedFinishedExecutions filters by finished or stoppedAt', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setCurrentWorkflowExecutions([
				makeExecutionSummary({ id: '1', finished: true }),
				makeExecutionSummary({ id: '2', finished: false }),
				makeExecutionSummary({ id: '3', finished: false, stoppedAt: new Date() }),
			]);

			expect(executionStateStore.getAllLoadedFinishedExecutions.map((e) => e.id).sort()).toEqual([
				'1',
				'3',
			]);
		});
	});

	describe('lastSuccessfulExecution', () => {
		it('stores execution as id reference and resolves through executionData store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const exec = makeExecution({ id: 'last-1', status: 'success', finished: true });

			executionStateStore.setLastSuccessfulExecution(exec);

			expect(executionStateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('is independent of active/displayed execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('active-1')).setExecution(
				makeExecution({ id: 'active-1' }),
			);
			executionStateStore.setActiveExecutionId('active-1');
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));

			expect(executionStateStore.activeExecutionId).toBe('active-1');
			expect(executionStateStore.lastSuccessfulExecutionId).toBe('last-1');
			expect(executionStateStore.activeExecution?.id).toBe('active-1');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('last-1');
		});

		it('disposes the previous executionData store entry on replacement', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			const pinia = getActivePinia();
			const previousStoreId = useExecutionDataStore(createExecutionDataId('last-1')).$id;

			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-2' }));

			expect(pinia?.state.value[previousStoreId]).toBeUndefined();
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('last-2');
		});

		it('clears via null', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'last-1' }));
			executionStateStore.setLastSuccessfulExecution(null);
			expect(executionStateStore.lastSuccessfulExecutionId).toBeNull();
			expect(executionStateStore.lastSuccessfulExecution).toBeNull();
		});

		it('does not dispose the previous store when it is also the active execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			executionStateStore.setActiveExecutionId('A');
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(executionStateStore.activeExecution?.id).toBe('A');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('B');
		});

		it('does not dispose the previous store when it is also the displayed execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('A')).setExecution(makeExecution({ id: 'A' }));
			executionStateStore.setActiveExecutionId('A');
			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'A' }));
			executionStateStore.setActiveExecutionId(undefined);
			const pinia = getActivePinia();
			const aStoreId = useExecutionDataStore(createExecutionDataId('A')).$id;

			executionStateStore.setLastSuccessfulExecution(makeExecution({ id: 'B' }));

			expect(pinia?.state.value[aStoreId]).toBeDefined();
			expect(executionStateStore.displayedExecutionId).toBe('A');
			expect(executionStateStore.activeExecution?.id).toBe('A');
			expect(executionStateStore.lastSuccessfulExecution?.id).toBe('B');
		});
	});

	describe('chat + trigger + flags', () => {
		it('appendChatMessage / resetChatMessages round-trip', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.appendChatMessage('hello');
			executionStateStore.appendChatMessage('world');
			expect(executionStateStore.chatMessages).toEqual(['hello', 'world']);
			expect(executionStateStore.getPastChatMessages).toEqual(['hello', 'world']);
			executionStateStore.resetChatMessages();
			expect(executionStateStore.chatMessages).toEqual([]);
		});

		it('setSelectedTriggerNodeName updates the value', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setSelectedTriggerNodeName('TriggerA');
			expect(executionStateStore.selectedTriggerNodeName).toBe('TriggerA');
			executionStateStore.setSelectedTriggerNodeName(undefined);
			expect(executionStateStore.selectedTriggerNodeName).toBeUndefined();
		});

		it('setExecutionWaitingForWebhook / setIsInDebugMode toggle flags', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setExecutionWaitingForWebhook(true);
			executionStateStore.setIsInDebugMode(true);
			expect(executionStateStore.executionWaitingForWebhook).toBe(true);
			expect(executionStateStore.isInDebugMode).toBe(true);
		});

		it('setChatPartialExecutionDestinationNode round-trip', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setChatPartialExecutionDestinationNode('NodeA');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('NodeA');
			executionStateStore.setChatPartialExecutionDestinationNode(null);
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBeNull();
		});
	});

	describe('renameExecutionStateNode', () => {
		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setSelectedTriggerNodeName('Old');
			executionStateStore.setChatPartialExecutionDestinationNode('Old');

			executionStateStore.renameExecutionStateNode('Old', 'New');

			expect(executionStateStore.selectedTriggerNodeName).toBe('New');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('does nothing when names do not match', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setSelectedTriggerNodeName('A');
			executionStateStore.setChatPartialExecutionDestinationNode('B');

			executionStateStore.renameExecutionStateNode('Other', 'Renamed');

			expect(executionStateStore.selectedTriggerNodeName).toBe('A');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('B');
		});
	});

	describe('renameActiveExecutionNode (cross-store)', () => {
		it('renames runData keys on the resolved executionData store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
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
			executionStateStore.setActiveExecutionId('exec-1');

			executionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			const runData = executionDataStore.execution?.data?.resultData.runData;
			expect(runData?.New).toBeDefined();
			expect(runData?.Old).toBeUndefined();
		});

		it('renames selectedTriggerNodeName and chatPartialExecutionDestinationNode', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setSelectedTriggerNodeName('Old');
			executionStateStore.setChatPartialExecutionDestinationNode('Old');

			executionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(executionStateStore.selectedTriggerNodeName).toBe('New');
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBe('New');
		});

		it('marks UI state dirty and remaps uiStore.lastSelectedNode when it matches', async () => {
			const { useUIStore } = await import('@/app/stores/ui.store');
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Old';
			const markDirtySpy = vi.spyOn(uiStore, 'markStateDirty');

			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

			executionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(markDirtySpy).toHaveBeenCalled();
			expect(uiStore.lastSelectedNode).toBe('New');
		});

		it('leaves uiStore.lastSelectedNode untouched when it does not match', async () => {
			const { useUIStore } = await import('@/app/stores/ui.store');
			const uiStore = useUIStore();
			uiStore.lastSelectedNode = 'Untouched';

			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(uiStore.lastSelectedNode).toBe('Untouched');
		});

		it('routes through the displayedExecutionId when active is cleared', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
			executionDataStore.setExecution(
				makeExecution({
					id: 'exec-1',
					data: { resultData: { runData: { Old: [] } } } as never,
				}),
			);
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId(undefined);

			executionStateStore.renameActiveExecutionNode({ old: 'Old', new: 'New' });

			expect(executionDataStore.execution?.data?.resultData.runData.New).toBeDefined();
		});
	});

	describe('resolveExecutionTriggerNodeName', () => {
		it('returns triggerNode from active execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					triggerNode: 'TriggerA',
					status: 'running',
					finished: false,
				}),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			expect(executionStateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe(
				'TriggerA',
			);
		});

		it('falls back to runData keys for partial executions', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({
					id: 'exec-1',
					status: 'running',
					finished: false,
					data: { resultData: { runData: { TriggerB: [] } } } as never,
				}),
			);
			executionStateStore.setActiveExecutionId('exec-1');

			expect(executionStateStore.resolveExecutionTriggerNodeName(['TriggerA', 'TriggerB'])).toBe(
				'TriggerB',
			);
		});

		it('returns undefined when not running', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			expect(executionStateStore.resolveExecutionTriggerNodeName(['TriggerA'])).toBeUndefined();
		});
	});

	describe('resetExecutionState', () => {
		it('clears every state field', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setPendingExecution(makeExecution());
			executionStateStore.setExecutionWaitingForWebhook(true);
			executionStateStore.setIsInDebugMode(true);
			executionStateStore.appendChatMessage('hi');
			executionStateStore.setChatPartialExecutionDestinationNode('Node');
			executionStateStore.setSelectedTriggerNodeName('Trigger');
			executionStateStore.setCurrentWorkflowExecutions([makeExecutionSummary({ id: '1' })]);
			executionStateStore.setLastSuccessfulExecutionId('last-1');
			executionStateStore.executingNode.addExecutingNode('Node');

			executionStateStore.resetExecutionState();

			expect(executionStateStore.activeExecutionId).toBeUndefined();
			expect(executionStateStore.displayedExecutionId).toBeUndefined();
			expect(executionStateStore.previousExecutionId).toBeUndefined();
			expect(executionStateStore.pendingExecution).toBeNull();
			expect(executionStateStore.executionWaitingForWebhook).toBe(false);
			expect(executionStateStore.isInDebugMode).toBe(false);
			expect(executionStateStore.chatMessages).toEqual([]);
			expect(executionStateStore.chatPartialExecutionDestinationNode).toBeNull();
			expect(executionStateStore.selectedTriggerNodeName).toBeUndefined();
			expect(executionStateStore.currentWorkflowExecutions).toEqual([]);
			expect(executionStateStore.lastSuccessfulExecutionId).toBeNull();
			expect(executionStateStore.executingNode.executingNode).toEqual([]);
			expect(executionStateStore.executingNode.lastAddedExecutingNode).toBeNull();
		});

		it('disposes per-execution data stores for every tracked id', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

			// Three sequential runs — exec-1 rolls out of previousExecutionId after exec-3.
			executionStateStore.setActiveExecutionId('exec-1');
			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			executionStateStore.setActiveExecutionId('exec-2');
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				makeExecution({ id: 'exec-2' }),
			);
			executionStateStore.setActiveExecutionId('exec-3');
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				makeExecution({ id: 'exec-3' }),
			);

			executionStateStore.resetExecutionState();

			// All three stores must be disposed — even exec-1 which is in no slot.
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('disposes the IN_PROGRESS placeholder store', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setPendingExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID, status: 'running' }),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			executionStateStore.resetExecutionState();

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
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));

			executionStateStore.setActiveExecutionId('exec-1');
			executionStateStore.setActiveExecutionId('exec-2');
			executionStateStore.setActiveExecutionId('exec-3');

			useExecutionDataStore(createExecutionDataId('exec-1')).setExecution(
				makeExecution({ id: 'exec-1' }),
			);
			useExecutionDataStore(createExecutionDataId('exec-2')).setExecution(
				makeExecution({ id: 'exec-2' }),
			);
			useExecutionDataStore(createExecutionDataId('exec-3')).setExecution(
				makeExecution({ id: 'exec-3' }),
			);

			executionStateStore.resetExecutionState();

			// All three are disposed even though exec-1 is in no slot after run 3.
			expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
			expect(useExecutionDataStore(createExecutionDataId('exec-3')).execution).toBeNull();
		});

		it('tracks ids written via setLastSuccessfulExecution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setLastSuccessfulExecution(
				makeExecution({ id: 'exec-success', finished: true, status: 'success' }),
			);

			executionStateStore.resetExecutionState();

			expect(useExecutionDataStore(createExecutionDataId('exec-success')).execution).toBeNull();
		});

		it('does not track the IN_PROGRESS placeholder id (handled separately)', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.trackExecutionId(IN_PROGRESS_EXECUTION_ID);
			executionStateStore.trackExecutionId('real-exec');

			useExecutionDataStore(createExecutionDataId('real-exec')).setExecution(
				makeExecution({ id: 'real-exec' }),
			);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				makeExecution({ id: IN_PROGRESS_EXECUTION_ID }),
			);

			executionStateStore.resetExecutionState();

			// Both stores get disposed: real-exec via tracked set, IN_PROGRESS unconditionally.
			expect(useExecutionDataStore(createExecutionDataId('real-exec')).execution).toBeNull();
			expect(
				useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).execution,
			).toBeNull();
		});

		it('ignores null and undefined ids', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.trackExecutionId(null);
			executionStateStore.trackExecutionId(undefined);
			executionStateStore.trackExecutionId('');

			// resetExecutionState must complete without error and produce no surprising side effects.
			expect(() => executionStateStore.resetExecutionState()).not.toThrow();
		});
	});

	describe('event hook', () => {
		it('fires onWorkflowExecutionStateChange with workflowId and field discriminator', () => {
			const id = createWorkflowDocumentId('wf-1');
			const executionStateStore = useWorkflowExecutionStateStore(id);
			const spy = vi.fn();
			executionStateStore.onWorkflowExecutionStateChange(spy);

			executionStateStore.setExecutionWaitingForWebhook(true);

			expect(spy).toHaveBeenCalled();
			expect(spy.mock.calls[0][0]).toMatchObject({
				action: 'update',
				payload: { documentId: id, field: 'executionWaitingForWebhook' },
			});
		});

		it('emits a delete action when clearing pending execution', () => {
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId('wf-1'));
			executionStateStore.setPendingExecution(makeExecution());

			const spy = vi.fn();
			executionStateStore.onWorkflowExecutionStateChange(spy);
			executionStateStore.setPendingExecution(null);

			expect(spy.mock.calls.some((c) => c[0].action === 'delete')).toBe(true);
		});
	});

	describe('disposeWorkflowExecutionStateStore', () => {
		it('removes pinia state and recreate yields fresh state', () => {
			const id = 'wf-disposable';
			const executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(id));
			const pinia = getActivePinia();
			const disposeSpy = vi.spyOn(executionStateStore, '$dispose');

			executionStateStore.setExecutionWaitingForWebhook(true);
			expect(pinia?.state.value[executionStateStore.$id]).toBeDefined();

			disposeWorkflowExecutionStateStore(executionStateStore);

			expect(disposeSpy).toHaveBeenCalledOnce();
			expect(pinia?.state.value[executionStateStore.$id]).toBeUndefined();

			const recreated = useWorkflowExecutionStateStore(createWorkflowDocumentId(id));
			expect(recreated).not.toBe(executionStateStore);
			expect(recreated.executionWaitingForWebhook).toBe(false);
		});

		it('releases running entries created from node-change events on dispose', () => {
			const id = createWorkflowDocumentId('wf-dispose-running');
			const documentStore = useWorkflowDocumentStore(id);
			const executionStateStore = useWorkflowExecutionStateStore(id);

			// Fired after store setup, so the entry's effect scope is created
			// outside any active parent scope.
			documentStore.addNode({
				id: 'node-1',
				name: 'Node 1',
				position: [0, 0],
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				parameters: {},
			});

			expect(executionStateStore.executionRunningByNodeId.has('node-1')).toBe(true);
			expect(executionStateStore.executionWaitingForNextByNodeId.has('node-1')).toBe(true);

			disposeWorkflowExecutionStateStore(executionStateStore);

			expect(executionStateStore.executionRunningByNodeId.size).toBe(0);
			expect(executionStateStore.executionWaitingForNextByNodeId.size).toBe(0);
		});
	});

	describe('injectWorkflowExecutionStateStore', () => {
		function renderWithInjector({ providedWorkflowId }: { providedWorkflowId?: string }) {
			let injected!: ReturnType<typeof injectWorkflowExecutionStateStore>;

			// inject() only resolves provides from ancestor components, so the
			// provide must live in a parent component.
			const ChildComponent = defineComponent({
				setup() {
					injected = injectWorkflowExecutionStateStore();
				},
				template: '<div />',
			});

			const ParentComponent = defineComponent({
				components: { ChildComponent },
				setup() {
					if (providedWorkflowId) {
						const scopedDocumentStore = useWorkflowDocumentStore(
							createWorkflowDocumentId(providedWorkflowId, 'scoped'),
						);
						provide(WorkflowDocumentStoreKey, shallowRef(scopedDocumentStore));
					}
				},
				template: '<ChildComponent />',
			});

			createComponentRenderer(ParentComponent)();

			return injected;
		}

		it('resolves the execution-state store of the provided workflow document', () => {
			const injected = renderWithInjector({ providedWorkflowId: 'scoped-workflow' });

			expect(injected.value.documentId).toBe(createWorkflowDocumentId('scoped-workflow', 'scoped'));
		});

		it('falls back to the global workflow id when nothing is provided', () => {
			useWorkflowsStore().setWorkflowId('global-workflow');

			const injected = renderWithInjector({});

			expect(injected.value.documentId).toBe(createWorkflowDocumentId('global-workflow'));
		});
	});
});
