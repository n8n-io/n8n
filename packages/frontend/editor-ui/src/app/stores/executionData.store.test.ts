import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { isProxy, nextTick, watch } from 'vue';
import {
	NodeConnectionTypes,
	SEND_AND_WAIT_OPERATION,
	WAIT_INDEFINITELY,
	createRunExecutionData,
} from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import {
	useExecutionDataStore,
	createExecutionDataId,
	getExecutionDataStoreId,
	disposeExecutionDataStore,
} from '@/app/stores/executionData.store';
import {
	CANVAS_EXECUTION_DATA_THROTTLE_DURATION,
	FORM_NODE_TYPE,
	WAIT_NODE_TYPE,
} from '@/app/constants';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}

function createTestExecution(overrides: Partial<IExecutionResponse> = {}): IExecutionResponse {
	return createTestWorkflowExecutionResponse({
		id: 'exec-1',
		finished: false,
		status: 'running',
		...overrides,
	});
}

describe('executionData.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('store identity', () => {
		it('uses an executionId-scoped store id', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-42'));
			expect(store.$id).toBe(getExecutionDataStoreId('exec-42'));
			expect(store.executionId).toBe('exec-42');
		});

		it('different executionIds produce isolated stores', () => {
			const a = useExecutionDataStore(createExecutionDataId('exec-a'));
			const b = useExecutionDataStore(createExecutionDataId('exec-b'));

			a.setExecution(createTestExecution({ id: 'exec-a' }));
			b.setExecution(createTestExecution({ id: 'exec-b' }));

			expect(a.execution?.id).toBe('exec-a');
			expect(b.execution?.id).toBe('exec-b');
		});
	});

	describe('setExecution', () => {
		it('stores the payload and resets started/paired-item state', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'node-a',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);
			expect(store.executionStartedData).toBeDefined();

			store.setExecution(createTestExecution());

			expect(store.execution?.id).toBe('exec-1');
			expect(store.executionStartedData).toBeUndefined();
			expect(store.executionPairedItemMappings).toEqual({});
		});

		it('strips waiting task data when waitTill is set', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.setExecution(
				createTestExecution({
					data: {
						waitTill: new Date(),
						resultData: {
							lastNodeExecuted: 'WaitNode',
							runData: {
								WaitNode: [{ executionStatus: 'waiting' } as never],
								OtherNode: [{ executionStatus: 'success' } as never],
							},
						},
					} as never,
				}),
			);

			expect(store.execution?.data?.resultData.runData.WaitNode).toBeUndefined();
			expect(store.execution?.data?.resultData.runData.OtherNode).toBeDefined();
		});

		it('keeps the last node data when the run was parked at worker shutdown', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.setExecution(
				createTestExecution({
					data: {
						waitTill: new Date(),
						waitReason: 'suspended',
						resultData: {
							lastNodeExecuted: 'LastDone',
							runData: { LastDone: [{ executionStatus: 'success' } as never] },
						},
					} as never,
				}),
			);

			expect(store.execution?.data?.resultData.runData.LastDone).toHaveLength(1);
		});

		it('honors stripWaitingTaskData=false', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.setExecution(
				createTestExecution({
					data: {
						waitTill: new Date(),
						resultData: {
							lastNodeExecuted: 'WaitNode',
							runData: {
								WaitNode: [{ executionStatus: 'waiting' } as never],
							},
						},
					} as never,
				}),
				{ stripWaitingTaskData: false },
			);

			expect(store.execution?.data?.resultData.runData.WaitNode).toHaveLength(1);
		});

		it('updates lastUpdate timestamp', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const before = Date.now();

			store.setExecution(createTestExecution());

			expect(store.executionResultDataLastUpdate).toBeGreaterThanOrEqual(before);
		});

		it('clears paired item mappings when setting execution to null', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution());

			store.setExecution(null);

			expect(store.executionPairedItemMappings).toEqual({});
		});
	});

	describe('updateNodeExecutionStatus', () => {
		it('appends and sets lastNodeExecuted', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution());

			store.updateNodeExecutionStatus({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: {
					executionStatus: 'success',
					startTime: 1,
					executionIndex: 0,
					executionTime: 10,
					source: [],
					hints: [],
				},
				itemCountByConnectionType: {},
			} as never);

			const runData = store.execution?.data?.resultData.runData;
			expect(runData?.NodeA).toHaveLength(1);
			expect(store.execution?.data?.resultData.lastNodeExecuted).toBe('NodeA');
		});

		it('replaces by executionIndex when not waiting', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(
				createTestExecution({
					data: {
						resultData: {
							runData: {
								NodeA: [{ executionIndex: 0, executionStatus: 'running', source: [] } as never],
							},
						},
					} as never,
				}),
			);

			store.updateNodeExecutionStatus({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: {
					executionStatus: 'success',
					executionIndex: 0,
					executionTime: 10,
					startTime: 1,
					source: [],
					hints: [],
				},
				itemCountByConnectionType: {},
			} as never);

			expect(store.execution?.data?.resultData.runData.NodeA).toHaveLength(1);
			expect(store.execution?.data?.resultData.runData.NodeA[0].executionStatus).toBe('success');
		});

		it('synthesizes redactionInfo from item-level markers', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution());

			store.updateNodeExecutionStatus({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: {
					executionStatus: 'success',
					startTime: 1,
					executionIndex: 0,
					executionTime: 10,
					source: [],
					hints: [],
					data: {
						main: [
							[
								{
									json: {},
									redaction: { redacted: true, reason: 'dynamic_credentials' },
								} as never,
							],
						],
					},
				},
				itemCountByConnectionType: {},
			} as never);

			expect(store.execution?.data?.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'dynamic_credentials',
				canReveal: false,
				provisional: true,
			});
		});

		it('does nothing when execution.data is null', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution({ data: undefined }));

			store.updateNodeExecutionStatus({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: {
					executionStatus: 'success',
					executionIndex: 0,
					executionTime: 5,
					startTime: 1,
					source: [],
					hints: [],
				},
				itemCountByConnectionType: {},
			} as never);

			expect(store.execution?.data).toBeUndefined();
		});
	});

	describe('updateNodeExecutionRunData', () => {
		it('splices placeholder by executionIndex', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(
				createTestExecution({
					data: {
						resultData: {
							runData: {
								NodeA: [
									{ executionIndex: 0, executionStatus: 'running', source: [] } as never,
									{ executionIndex: 1, executionStatus: 'running', source: [] } as never,
								],
							},
						},
					} as never,
				}),
			);

			store.updateNodeExecutionRunData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: {
					executionStatus: 'success',
					executionIndex: 0,
					executionTime: 5,
					startTime: 1,
					source: [],
					hints: [],
				},
				itemCountByConnectionType: {},
			} as never);

			const tasks = store.execution?.data?.resultData.runData.NodeA;
			expect(tasks?.[0].executionStatus).toBe('success');
			expect(tasks?.[1].executionStatus).toBe('running');
		});

		it('does nothing when no matching executionIndex exists', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(
				createTestExecution({
					data: { resultData: { runData: { NodeA: [] } } } as never,
				}),
			);

			store.updateNodeExecutionRunData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: { executionIndex: 0, executionStatus: 'success', source: [] } as never,
				itemCountByConnectionType: {},
			} as never);

			expect(store.execution?.data?.resultData.runData.NodeA).toEqual([]);
		});
	});

	describe('clearNodeExecutionData', () => {
		it('removes the named node from runData', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(
				createTestExecution({
					data: {
						resultData: {
							runData: {
								NodeA: [{ executionStatus: 'success' } as never],
								NodeB: [{ executionStatus: 'success' } as never],
							},
						},
					} as never,
				}),
			);

			store.clearNodeExecutionData('NodeA');

			expect(store.execution?.data?.resultData.runData.NodeA).toBeUndefined();
			expect(store.execution?.data?.resultData.runData.NodeB).toBeDefined();
		});
	});

	describe('renameExecutionDataNode', () => {
		it('rewrites runData keys, source, pinData, and workflowData', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(
				createTestExecution({
					executedNode: 'OldName',
					data: {
						resultData: {
							lastNodeExecuted: 'OldName',
							runData: {
								OldName: [
									{
										executionIndex: 0,
										executionStatus: 'success',
										source: [{ previousNode: 'OldName' }],
									} as never,
								],
								OtherNode: [
									{
										executionIndex: 0,
										executionStatus: 'success',
										source: [{ previousNode: 'OldName' }],
									} as never,
								],
							},
							pinData: {
								OldName: [
									{
										json: {},
										pairedItem: { item: 0, sourceOverwrite: { previousNode: 'OldName' } },
									},
								],
							},
						},
					} as never,
					workflowData: {
						id: 'wf-1',
						name: 'Test',
						active: false,
						activeVersionId: null,
						isArchived: false,
						createdAt: -1,
						updatedAt: -1,
						nodes: [{ name: 'OldName' } as never, { name: 'OtherNode' } as never],
						connections: {
							OldName: { main: [[{ node: 'OtherNode', type: 'main', index: 0 }]] },
							OtherNode: { main: [[{ node: 'OldName', type: 'main', index: 0 }]] },
						} as never,
						settings: { executionOrder: 'v1' },
						tags: [],
						pinData: { OldName: [{ json: {} }] },
						versionId: '',
					},
				}),
			);

			store.renameExecutionDataNode('OldName', 'NewName');

			const runData = store.execution?.data?.resultData.runData;
			expect(runData?.NewName).toBeDefined();
			expect(runData?.OldName).toBeUndefined();
			expect(runData?.OtherNode?.[0].source?.[0]?.previousNode).toBe('NewName');

			const pinData = store.execution?.data?.resultData.pinData;
			expect(pinData?.NewName).toBeDefined();
			expect(pinData?.OldName).toBeUndefined();
			const overwrite = pinData?.NewName?.[0].pairedItem as
				| { sourceOverwrite?: { previousNode: string } }
				| undefined;
			expect(overwrite?.sourceOverwrite?.previousNode).toBe('NewName');
			expect(store.execution?.executedNode).toBe('NewName');

			const workflowData = store.execution?.workflowData;
			expect(workflowData?.nodes.find((n) => n.name === 'NewName')).toBeDefined();
			expect(workflowData?.connections?.NewName).toBeDefined();
			expect(workflowData?.connections?.OldName).toBeUndefined();
			expect(workflowData?.connections?.OtherNode?.main?.[0]?.[0]?.node).toBe('NewName');
			expect(workflowData?.pinData?.NewName).toBeDefined();
			expect(workflowData?.pinData?.OldName).toBeUndefined();
		});

		it('replaces the workflowData reference so identity-gated consumers detect the rename', () => {
			// The embedded workflowData snapshot is mutated in place, so consumers
			// that only rebuild when its reference changes (e.g. the logs panel's
			// Workflow object) would otherwise read stale topology against renamed
			// run data. Renaming must hand back a fresh reference.
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(
				createTestExecution({
					data: {
						resultData: {
							runData: {
								OldName: [{ executionIndex: 0, executionStatus: 'success', source: [] } as never],
							},
						},
					} as never,
					workflowData: {
						id: 'wf-1',
						name: 'Test',
						active: false,
						activeVersionId: null,
						isArchived: false,
						createdAt: -1,
						updatedAt: -1,
						nodes: [{ name: 'OldName' } as never],
						connections: {} as never,
						settings: { executionOrder: 'v1' },
						tags: [],
						pinData: {},
						versionId: '',
					},
				}),
			);

			const before = store.execution?.workflowData;

			store.renameExecutionDataNode('OldName', 'NewName');

			expect(store.execution?.workflowData).not.toBe(before);
			expect(store.execution?.workflowData?.nodes.find((n) => n.name === 'NewName')).toBeDefined();
		});
	});

	describe('addNodeExecutionStartedData', () => {
		it('accumulates per node for the same executionId', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);
			store.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: { startTime: 2, executionIndex: 1, source: [], hints: [] },
			} as never);

			expect(store.executionStartedData?.[0]).toBe('exec-1');
			expect(store.executionStartedData?.[1].NodeA).toHaveLength(2);
		});

		it('resets accumulator when executionId changes', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);
			store.addNodeExecutionStartedData({
				executionId: 'exec-2',
				nodeName: 'NodeA',
				data: { startTime: 2, executionIndex: 0, source: [], hints: [] },
			} as never);

			expect(store.executionStartedData?.[0]).toBe('exec-2');
			expect(store.executionStartedData?.[1].NodeA).toHaveLength(1);
		});
	});

	describe('getExecutionRunDataByNodeName', () => {
		it('returns null when no execution is set', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			expect(store.getExecutionRunDataByNodeName('Foo')).toBeNull();
		});

		it('returns the named run data when present', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const tasks = [{ executionStatus: 'success' } as never];
			store.setExecution(
				createTestExecution({
					data: { resultData: { runData: { NodeA: tasks } } } as never,
				}),
			);

			expect(store.getExecutionRunDataByNodeName('NodeA')).toEqual(tasks);
			expect(store.getExecutionRunDataByNodeName('Other')).toBeNull();
		});
	});

	describe('resetExecutionData', () => {
		it('clears execution, started data, and paired-item mappings', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution());
			store.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'node-a',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);

			store.resetExecutionData();

			expect(store.execution).toBeNull();
			expect(store.executionStartedData).toBeUndefined();
			expect(store.executionPairedItemMappings).toEqual({});
		});
	});

	describe('onExecutionDataChange', () => {
		it('fires a single event per setExecution', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const spy = vi.fn();
			store.onExecutionDataChange(spy);

			store.setExecution(createTestExecution());

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0].action).toBe('update');
			expect(spy.mock.calls[0][0].payload.executionId).toBe('exec-1');
		});

		it('fires DELETE when execution is set to null', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const spy = vi.fn();
			store.onExecutionDataChange(spy);

			store.setExecution(null);

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0].action).toBe('delete');
		});

		it('fires a single event on resetExecutionData', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution());

			const spy = vi.fn();
			store.onExecutionDataChange(spy);

			store.resetExecutionData();

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0].action).toBe('delete');
		});

		it('surfaces nodeName for per-node mutations', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution());

			const spy = vi.fn();
			store.onExecutionDataChange(spy);

			store.clearNodeExecutionData('NodeA');

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0].payload.nodeName).toBe('NodeA');
		});

		it('fires ADD with nodeName when accumulating started data', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const spy = vi.fn();
			store.onExecutionDataChange(spy);

			store.addNodeExecutionStartedData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: { startTime: 1, executionIndex: 0, source: [], hints: [] },
			} as never);

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0].action).toBe('add');
			expect(spy.mock.calls[0][0].payload).toMatchObject({
				executionId: 'exec-1',
				nodeName: 'NodeA',
			});
		});
	});

	describe('mutation commit channels', () => {
		// Every mutation must commit through three channels (new identities
		// along the changed path, timestamp bump, change event) — see
		// commitExecutionMutation in the store. Fake timers make Date.now()
		// deterministic so a bump is distinguishable from a same-millisecond
		// no-op.
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		type ExecutionDataStore = ReturnType<typeof useExecutionDataStore>;

		function seedExecution(store: ExecutionDataStore) {
			store.setExecution(
				createTestExecution({
					data: {
						resultData: {
							runData: {
								NodeA: [{ executionIndex: 0, executionStatus: 'running', source: [] } as never],
								NodeB: [{ executionIndex: 1, executionStatus: 'success', source: [] } as never],
							},
						},
					} as never,
				}),
			);
		}

		function createNodeExecuteAfterDataPayload() {
			return {
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: {
					executionStatus: 'success',
					startTime: 1,
					executionIndex: 0,
					executionTime: 10,
					source: [],
					hints: [],
				},
				itemCountByConnectionType: {},
			} as never;
		}

		const mutations: Array<{
			name: string;
			mutate: (store: ExecutionDataStore) => void;
			action: 'update' | 'delete';
			nodeName?: string;
			// The node whose task array the mutation replaces.
			changedNode?: string;
		}> = [
			{
				name: 'updateNodeExecutionStatus',
				mutate: (store) => store.updateNodeExecutionStatus(createNodeExecuteAfterDataPayload()),
				action: 'update',
				nodeName: 'NodeA',
				changedNode: 'NodeA',
			},
			{
				name: 'updateNodeExecutionRunData',
				mutate: (store) => store.updateNodeExecutionRunData(createNodeExecuteAfterDataPayload()),
				action: 'update',
				nodeName: 'NodeA',
				changedNode: 'NodeA',
			},
			{
				name: 'clearNodeExecutionData',
				mutate: (store) => store.clearNodeExecutionData('NodeA'),
				action: 'delete',
				nodeName: 'NodeA',
			},
			{
				name: 'renameExecutionDataNode',
				mutate: (store) => store.renameExecutionDataNode('NodeA', 'NodeC'),
				action: 'update',
			},
			{
				name: 'markAsStopped',
				mutate: (store) =>
					store.markAsStopped({
						status: 'canceled',
						startedAt: new Date(0),
						stoppedAt: new Date(1),
					}),
				action: 'update',
				changedNode: 'NodeA',
			},
		];

		it.each(mutations)('$name bumps executionResultDataLastUpdate', ({ mutate }) => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			seedExecution(store);
			const before = store.executionResultDataLastUpdate ?? 0;
			vi.advanceTimersByTime(1);

			mutate(store);

			expect(store.executionResultDataLastUpdate).toBe(before + 1);
		});

		it.each(mutations)('$name replaces the top-level execution identity', ({ mutate }) => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			seedExecution(store);
			const before = store.execution;

			mutate(store);

			expect(store.execution).not.toBeNull();
			expect(store.execution).not.toBe(before);
		});

		it.each(mutations)(
			'$name replaces the changed path and keeps the identity of untouched nodes',
			({ mutate, changedNode }) => {
				const store = useExecutionDataStore(createExecutionDataId('exec-1'));
				seedExecution(store);
				const before = store.execution;
				const beforeRunData = before?.data?.resultData.runData;

				mutate(store);

				const after = store.execution;
				expect(after?.data).not.toBe(before?.data);
				expect(after?.data?.resultData).not.toBe(before?.data?.resultData);
				expect(after?.data?.resultData.runData).not.toBe(beforeRunData);
				if (changedNode) {
					expect(after?.data?.resultData.runData[changedNode]).not.toBe(
						beforeRunData?.[changedNode],
					);
				}
				expect(after?.data?.resultData.runData.NodeB).toBe(beforeRunData?.NodeB);
			},
		);

		it.each(mutations)('$name fires exactly one change event', ({ mutate, action, nodeName }) => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			seedExecution(store);
			const spy = vi.fn();
			store.onExecutionDataChange(spy);

			mutate(store);

			expect(spy).toHaveBeenCalledTimes(1);
			expect(spy.mock.calls[0][0].action).toBe(action);
			expect(spy.mock.calls[0][0].payload).toEqual({
				executionId: 'exec-1',
				...(nodeName ? { nodeName } : {}),
			});
		});

		it('updateNodeExecutionRunData signals no channel when no matching executionIndex exists', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			seedExecution(store);
			const beforeTimestamp = store.executionResultDataLastUpdate;
			const beforeExecution = store.execution;
			const spy = vi.fn();
			store.onExecutionDataChange(spy);
			vi.advanceTimersByTime(1);

			store.updateNodeExecutionRunData({
				executionId: 'exec-1',
				nodeName: 'NodeA',
				data: { executionIndex: 99, executionStatus: 'success', source: [] },
				itemCountByConnectionType: {},
			} as never);

			expect(spy).not.toHaveBeenCalled();
			expect(store.executionResultDataLastUpdate).toBe(beforeTimestamp);
			expect(store.execution).toBe(beforeExecution);
		});

		it('updateNodeExecutionStatus signals no channel when execution data is missing', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createTestExecution({ data: undefined }));
			const beforeTimestamp = store.executionResultDataLastUpdate;
			const beforeExecution = store.execution;
			const spy = vi.fn();
			store.onExecutionDataChange(spy);
			vi.advanceTimersByTime(1);

			store.updateNodeExecutionStatus(createNodeExecuteAfterDataPayload());

			expect(spy).not.toHaveBeenCalled();
			expect(store.executionResultDataLastUpdate).toBe(beforeTimestamp);
			expect(store.execution).toBe(beforeExecution);
		});
	});

	describe('copy-on-write', () => {
		type ExecutionDataStore = ReturnType<typeof useExecutionDataStore>;

		const nodeA = createTestNode({ id: 'node-a', name: 'NodeA' });
		const nodeB = createTestNode({ id: 'node-b', name: 'NodeB' });

		function createSeedExecution(overrides: Partial<IExecutionResponse> = {}) {
			return createTestExecution({
				executedNode: 'NodeA',
				workflowData: createTestWorkflow({
					nodes: [nodeA, nodeB],
					connections: {
						NodeA: { main: [[{ node: 'NodeB', type: 'main', index: 0 }]] },
						NodeB: { main: [[{ node: 'NodeA', type: 'main', index: 0 }]] },
					},
					pinData: { NodeA: [{ json: { pinned: true } }] },
				}),
				data: createRunExecutionData({
					resultData: {
						lastNodeExecuted: 'NodeA',
						runData: {
							NodeA: [
								createTestTaskData({ executionIndex: 0, executionStatus: 'success' }),
								createTestTaskData({ executionIndex: 1, executionStatus: 'running' }),
							],
							NodeB: [
								createTestTaskData({
									executionIndex: 2,
									executionStatus: 'success',
									source: [{ previousNode: 'NodeA' }],
								}),
							],
						},
						pinData: {
							NodeA: [
								{
									json: {},
									pairedItem: { item: 0, sourceOverwrite: { previousNode: 'NodeA' } },
								},
							],
						},
					},
				}),
				...overrides,
			});
		}

		function createPayload(
			nodeName: string,
			data: Partial<ReturnType<typeof createTestTaskData>> = {},
		) {
			return {
				executionId: 'exec-1',
				nodeName,
				data: createTestTaskData({ executionIndex: 1, executionStatus: 'success', ...data }),
				itemCountByConnectionType: {},
			} as never;
		}

		const cases: Array<{
			name: string;
			execution?: () => IExecutionResponse;
			mutate: (store: ExecutionDataStore) => void;
			verify: (store: ExecutionDataStore) => void;
		}> = [
			{
				name: 'updateNodeExecutionStatus adds a new node',
				mutate: (store) => store.updateNodeExecutionStatus(deepFreeze(createPayload('NodeD'))),
				verify: (store) => {
					expect(store.executionRunData?.NodeD).toHaveLength(1);
					expect(store.execution?.data?.resultData.lastNodeExecuted).toBe('NodeD');
				},
			},
			{
				name: 'updateNodeExecutionStatus replaces a running task',
				mutate: (store) => store.updateNodeExecutionStatus(deepFreeze(createPayload('NodeA'))),
				verify: (store) => {
					expect(store.executionRunData?.NodeA).toHaveLength(2);
					expect(store.executionRunData?.NodeA[1].executionStatus).toBe('success');
				},
			},
			{
				name: 'updateNodeExecutionStatus appends a task',
				mutate: (store) =>
					store.updateNodeExecutionStatus(
						deepFreeze(createPayload('NodeB', { executionIndex: 3 })),
					),
				verify: (store) => {
					expect(store.executionRunData?.NodeB).toHaveLength(2);
					expect(store.executionRunData?.NodeB[1].executionIndex).toBe(3);
				},
			},
			{
				name: 'updateNodeExecutionStatus appends a waiting task',
				mutate: (store) =>
					store.updateNodeExecutionStatus(
						deepFreeze(createPayload('NodeA', { executionIndex: 4, executionStatus: 'waiting' })),
					),
				verify: (store) => {
					expect(store.executionRunData?.NodeA).toHaveLength(3);
					expect(store.executionRunData?.NodeA[2].executionStatus).toBe('waiting');
				},
			},
			{
				name: 'updateNodeExecutionStatus synthesizes provisional redaction',
				mutate: (store) =>
					store.updateNodeExecutionStatus(
						deepFreeze(
							createPayload('NodeA', {
								data: {
									main: [
										[{ json: {}, redaction: { redacted: true, reason: 'dynamic_credentials' } }],
									],
								} as never,
							}),
						),
					),
				verify: (store) => {
					expect(store.execution?.data?.redactionInfo).toEqual({
						isRedacted: true,
						reason: 'dynamic_credentials',
						canReveal: false,
						provisional: true,
					});
				},
			},
			{
				name: 'updateNodeExecutionRunData',
				mutate: (store) =>
					store.updateNodeExecutionRunData(
						deepFreeze(createPayload('NodeA', { executionStatus: 'error' })),
					),
				verify: (store) => {
					expect(store.executionRunData?.NodeA[1].executionStatus).toBe('error');
				},
			},
			{
				name: 'clearNodeExecutionData',
				mutate: (store) => store.clearNodeExecutionData('NodeA'),
				verify: (store) => {
					expect(store.executionRunData?.NodeA).toBeUndefined();
					expect(store.executionRunData?.NodeB).toHaveLength(1);
				},
			},
			{
				name: 'renameExecutionDataNode',
				mutate: (store) => store.renameExecutionDataNode('NodeA', 'NodeC'),
				verify: (store) => {
					const execution = store.execution;
					const resultData = execution?.data?.resultData;
					expect(Object.keys(resultData?.runData ?? {}).sort()).toEqual(['NodeB', 'NodeC']);
					expect(resultData?.runData.NodeB[0].source[0]?.previousNode).toBe('NodeC');
					expect(Object.keys(resultData?.pinData ?? {})).toEqual(['NodeC']);
					expect(resultData?.pinData?.NodeC[0].pairedItem).toEqual({
						item: 0,
						sourceOverwrite: { previousNode: 'NodeC' },
					});
					expect(execution?.workflowData.nodes.map((node) => node.name)).toEqual([
						'NodeC',
						'NodeB',
					]);
					expect(Object.keys(execution?.workflowData.connections ?? {}).sort()).toEqual([
						'NodeB',
						'NodeC',
					]);
					expect(execution?.workflowData.connections.NodeB.main[0]?.[0].node).toBe('NodeC');
					expect(Object.keys(execution?.workflowData.pinData ?? {})).toEqual(['NodeC']);
					expect(execution?.executedNode).toBe('NodeC');
				},
			},
			{
				name: 'markAsStopped',
				mutate: (store) =>
					store.markAsStopped({
						status: 'canceled',
						startedAt: new Date(0),
						stoppedAt: new Date(1),
					}),
				verify: (store) => {
					expect(store.executionRunData?.NodeA).toHaveLength(1);
					expect(store.executionRunData?.NodeA[0].executionStatus).toBe('success');
					expect(store.execution?.status).toBe('canceled');
					expect(store.execution?.stoppedAt).toEqual(new Date(1));
				},
			},
		];

		it.each(cases)('$name never writes into a frozen execution', ({ mutate, verify }) => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(deepFreeze(createSeedExecution()));

			expect(() => mutate(store)).not.toThrow();
			verify(store);
		});

		it.each(cases)('$name leaves no Vue proxy in the payload', ({ mutate }) => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			store.setExecution(createSeedExecution());

			mutate(store);

			expect(isProxy(store.execution)).toBe(false);
			expect(isProxy(store.execution?.data?.resultData.runData)).toBe(false);
			expect(isProxy(store.executionRunData)).toBe(false);
			expect(isProxy(store.executionRunData?.NodeB)).toBe(false);
		});

		it('setExecution leaves no Vue proxy in the payload', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const execution = createSeedExecution();

			store.setExecution(execution);

			expect(store.execution).toBe(execution);
			expect(isProxy(store.execution)).toBe(false);
			expect(isProxy(store.execution?.data?.resultData.runData)).toBe(false);
			expect(isProxy(store.executionRunData)).toBe(false);
			expect(isProxy(store.executionRunData?.NodeA)).toBe(false);
		});

		it('setExecution strips the waiting task without changing the frozen input', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const execution = createSeedExecution();
			execution.data = createRunExecutionData({
				...execution.data,
				waitTill: new Date(),
			});
			deepFreeze(execution);

			expect(() => store.setExecution(execution)).not.toThrow();

			expect(store.executionRunData?.NodeA).toBeUndefined();
			expect(store.executionRunData?.NodeB).toHaveLength(1);
			expect(execution.data?.resultData.runData.NodeA).toHaveLength(2);
		});

		describe('notifies consumers during a live run', () => {
			const pushes: Array<{
				name: string;
				mutate: (store: ExecutionDataStore, payload: never) => void;
			}> = [
				{
					name: 'updateNodeExecutionStatus',
					mutate: (store, payload) => store.updateNodeExecutionStatus(payload),
				},
				{
					name: 'updateNodeExecutionRunData',
					mutate: (store, payload) => store.updateNodeExecutionRunData(payload),
				},
			];

			it.each(pushes)('$name fires sync watchers with the new value', ({ mutate }) => {
				const store = useExecutionDataStore(createExecutionDataId('exec-1'));
				store.setExecution(createSeedExecution());

				const runDataSpy = vi.fn();
				const nodeARunDataSpy = vi.fn();
				const nodeBRunDataSpy = vi.fn();
				const statusSpy = vi.fn();
				const issuesSpy = vi.fn();
				watch(() => store.executionRunData, runDataSpy, { flush: 'sync' });
				watch(() => store.executionRunDataByNodeId.get('node-a')?.value, nodeARunDataSpy, {
					flush: 'sync',
				});
				watch(() => store.executionRunDataByNodeId.get('node-b')?.value, nodeBRunDataSpy, {
					flush: 'sync',
				});
				watch(() => store.executionStatusByNodeId.get('node-a')?.value, statusSpy, {
					flush: 'sync',
				});
				watch(() => store.executionIssuesByNodeName.get('NodeA')?.value, issuesSpy, {
					flush: 'sync',
				});

				// A different status and error, so the structural gates see a change.
				mutate(
					store,
					createPayload('NodeA', { executionStatus: 'error', error: { message: 'boom' } as never }),
				);

				expect(runDataSpy).toHaveBeenCalledTimes(1);
				expect(runDataSpy.mock.calls[0][0]).toBe(store.executionRunData);
				expect(nodeARunDataSpy).toHaveBeenCalledTimes(1);
				expect(nodeARunDataSpy.mock.calls[0][0]).toBe(store.executionRunData?.NodeA);
				expect(statusSpy).toHaveBeenCalledTimes(1);
				expect(statusSpy.mock.calls[0][0]).toBe('error');
				expect(issuesSpy).toHaveBeenCalledTimes(1);
				expect(issuesSpy.mock.calls[0][0]).toEqual(['boom']);
				expect(nodeBRunDataSpy).not.toHaveBeenCalled();
			});
		});

		it('does not write into run data that a previous execution shares', () => {
			const previous = useExecutionDataStore(createExecutionDataId('exec-previous'));
			previous.setExecution(createSeedExecution({ id: 'exec-previous' }));
			const sharedRunData = previous.execution?.data?.resultData.runData;
			const sharedNodeA = sharedRunData?.NodeA;
			const sharedNodeB = sharedRunData?.NodeB;
			const expected = structuredClone(sharedRunData);

			// A partial run starts with the previous execution's runData object.
			const next = useExecutionDataStore(createExecutionDataId('exec-1'));
			next.setExecution(
				createSeedExecution({
					data: createRunExecutionData({ resultData: { runData: sharedRunData } }),
				}),
			);

			next.markAsStopped({ status: 'canceled', startedAt: new Date(0), stoppedAt: new Date(1) });
			next.renameExecutionDataNode('NodeA', 'NodeC');

			expect(next.executionRunData?.NodeC).toHaveLength(1);
			const runData = previous.execution?.data?.resultData.runData;
			expect(runData).toBe(sharedRunData);
			expect(Object.keys(runData ?? {})).toEqual(['NodeA', 'NodeB']);
			expect(runData?.NodeA).toBe(sharedNodeA);
			expect(runData?.NodeB).toBe(sharedNodeB);
			expect(runData).toEqual(expected);
		});
	});

	describe('disposeExecutionDataStore', () => {
		it('removes pinia state and recreate yields fresh state', () => {
			const id = createExecutionDataId('exec-disposable');
			const store = useExecutionDataStore(id);
			const pinia = getActivePinia();
			const disposeSpy = vi.spyOn(store, '$dispose');

			store.setExecution(createTestExecution({ id: 'exec-disposable' }));
			expect(pinia?.state.value[store.$id]).toBeDefined();

			disposeExecutionDataStore(store);

			expect(disposeSpy).toHaveBeenCalledOnce();
			expect(pinia?.state.value[store.$id]).toBeUndefined();

			const recreated = useExecutionDataStore(id);
			expect(recreated).not.toBe(store);
			expect(recreated.execution).toBeNull();
			expect(recreated.executionStartedData).toBeUndefined();
		});
	});

	describe('executionIssuesByNodeName', () => {
		function setExecutionWithRunData(
			store: ReturnType<typeof useExecutionDataStore>,
			runData: Record<string, Array<Record<string, unknown>>>,
		) {
			store.setExecution(
				createTestExecution({
					data: {
						resultData: { runData, lastNodeExecuted: '' },
					} as never,
				}),
			);
		}

		it('starts empty when no execution is set', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			expect(store.executionIssuesByNodeName.size).toBe(0);
		});

		it('adds an entry per node name present in runData on setExecution', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ executionStatus: 'success' }],
				NodeB: [{ executionStatus: 'error' }],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.has('NodeA')).toBe(true);
			expect(store.executionIssuesByNodeName.has('NodeB')).toBe(true);
		});

		it('returns the formatted error message with description', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ error: { message: 'msg', description: 'desc' } }],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toEqual(['msg (desc)']);
		});

		it('returns just the message when no description is provided', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ error: { message: 'msg' } }],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toEqual(['msg']);
		});

		it('aggregates errors across multiple tasks', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [
					{ error: { message: 'e1', description: 'd1' } },
					{ error: { message: 'e2', description: 'd2' } },
				],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toEqual(['e1 (d1)', 'e2 (d2)']);
		});

		it('hides earlier errors when the latest task succeeded (AI tool retry)', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [
					{ executionStatus: 'error', error: { message: 'wrong password' } },
					{ executionStatus: 'success' },
				],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toEqual([]);
		});

		it('still surfaces the error when the latest task failed after an earlier success', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [
					{ executionStatus: 'success' },
					{ executionStatus: 'error', error: { message: 'wrong password' } },
				],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toEqual(['wrong password']);
		});

		it('returns [] when a node has tasks but no errors', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ executionStatus: 'success' }],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toEqual([]);
		});

		it('sanitises html in error messages', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ error: { message: '<script>x</script>', description: 'd' } }],
			});
			await flushPromises();

			const issues = store.executionIssuesByNodeName.get('NodeA')?.value ?? [];
			expect(issues[0]).not.toContain('<script>');
		});

		it('removes entries that no longer appear in runData on subsequent setExecution', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ executionStatus: 'success' }],
				NodeB: [{ executionStatus: 'success' }],
			});
			await flushPromises();
			expect(store.executionIssuesByNodeName.has('NodeA')).toBe(true);
			expect(store.executionIssuesByNodeName.has('NodeB')).toBe(true);

			setExecutionWithRunData(store, {
				NodeB: [{ executionStatus: 'success' }],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.has('NodeA')).toBe(false);
			expect(store.executionIssuesByNodeName.has('NodeB')).toBe(true);
		});

		it('removes an entry when clearNodeExecutionData empties a node', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ executionStatus: 'success' }],
			});
			await flushPromises();
			expect(store.executionIssuesByNodeName.has('NodeA')).toBe(true);

			store.clearNodeExecutionData('NodeA');
			await flushPromises();

			expect(store.executionIssuesByNodeName.has('NodeA')).toBe(false);
		});

		it('clears all entries on resetExecutionData', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ executionStatus: 'success' }],
				NodeB: [{ executionStatus: 'success' }],
			});
			await flushPromises();
			expect(store.executionIssuesByNodeName.size).toBe(2);

			store.resetExecutionData();
			await flushPromises();

			expect(store.executionIssuesByNodeName.size).toBe(0);
		});

		it('migrates the entry from old to new name on renameExecutionDataNode', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				OldName: [{ error: { message: 'boom' } }],
			});
			await flushPromises();
			expect(store.executionIssuesByNodeName.has('OldName')).toBe(true);

			store.renameExecutionDataNode('OldName', 'NewName');
			await flushPromises();

			expect(store.executionIssuesByNodeName.has('OldName')).toBe(false);
			expect(store.executionIssuesByNodeName.get('NewName')?.value).toEqual(['boom']);
		});

		it('produces a stable ComputedRef value across unrelated runData mutations', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithRunData(store, {
				NodeA: [{ error: { message: 'a-err' } }],
				NodeB: [{ error: { message: 'b-err' } }],
			});
			await flushPromises();

			const nodeAEntry = store.executionIssuesByNodeName.get('NodeA');
			const before = nodeAEntry?.value;

			// Mutate NodeB only; structuralComputed + isEqual should keep NodeA's
			// value reference stable.
			setExecutionWithRunData(store, {
				NodeA: [{ error: { message: 'a-err' } }],
				NodeB: [{ error: { message: 'b-changed' } }],
			});
			await flushPromises();

			expect(store.executionIssuesByNodeName.get('NodeA')?.value).toBe(before);
		});
	});

	// -------------------------------------------------------------------------
	// Per-node-id projections (moved here from useCanvasMapping).
	// -------------------------------------------------------------------------

	/**
	 * Builds an execution whose embedded `workflowData.nodes` snapshot provides
	 * the id↔name mapping the by-id projections key off, with `runData` keyed by
	 * node name as the server produces it.
	 */
	function setExecutionWithSnapshot(
		store: ReturnType<typeof useExecutionDataStore>,
		{
			nodes,
			runData = {},
			lastNodeExecuted = '',
			...executionOverrides
		}: {
			nodes: INode[];
			runData?: Record<string, Array<Record<string, unknown>>>;
			lastNodeExecuted?: string;
		} & Partial<IExecutionResponse>,
	) {
		store.setExecution(
			createTestExecution({
				workflowData: createTestWorkflow({ nodes }),
				data: {
					resultData: { runData, lastNodeExecuted },
				} as never,
				...executionOverrides,
			}),
		);
	}

	describe('executionStatusByNodeId', () => {
		const node = createTestNode({ id: 'node-1', name: 'Node 1' });

		it('returns the last execution status when not canceled', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [{ executionStatus: 'success' }, { executionStatus: 'error' }],
				},
			});

			expect(store.executionStatusByNodeId.get('node-1')?.value).toBe('error');
		});

		it('returns the second-to-last status when the last task is canceled and multiple tasks exist', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [{ executionStatus: 'success' }, { executionStatus: 'canceled' }],
				},
			});

			expect(store.executionStatusByNodeId.get('node-1')?.value).toBe('success');
		});

		it('returns canceled when the only task is canceled', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [{ executionStatus: 'canceled' }],
				},
			});

			expect(store.executionStatusByNodeId.get('node-1')?.value).toBe('canceled');
		});

		it('returns new when the node has no tasks', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, { nodes: [node], runData: {} });

			expect(store.executionStatusByNodeId.get('node-1')?.value).toBe('new');
		});

		it('has no entry for nodes absent from the workflow snapshot', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, { nodes: [node] });

			expect(store.executionStatusByNodeId.has('unknown-node')).toBe(false);
		});
	});

	describe('executionWaitingByNodeId', () => {
		const waitTill = new Date('2025-05-05T12:00:00.000Z');

		function setWaitingExecution(
			store: ReturnType<typeof useExecutionDataStore>,
			node: INode,
			overrides: Partial<IExecutionResponse> = {},
		) {
			setExecutionWithSnapshot(store, {
				nodes: [node],
				lastNodeExecuted: node.name,
				finished: false,
				...({ waitTill } as Partial<IExecutionResponse>),
				...overrides,
			});
		}

		it('returns nothing for a run parked at worker shutdown', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({
				id: 'wait-1',
				name: 'Wait',
				type: WAIT_NODE_TYPE,
				parameters: { resume: 'webhook' },
			});

			setWaitingExecution(store, node, {
				data: {
					waitReason: 'suspended',
					resultData: { runData: {}, lastNodeExecuted: node.name },
				} as never,
			});

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBeUndefined();
		});

		it('returns the webhook message for a wait node resuming on webhook', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({
				id: 'wait-1',
				name: 'Wait',
				type: WAIT_NODE_TYPE,
				parameters: { resume: 'webhook' },
			});

			setWaitingExecution(store, node);

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBe(
				'The node is waiting for an incoming webhook call',
			);
		});

		it('returns the form message for a wait node resuming on form submission', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({
				id: 'wait-1',
				name: 'Wait',
				type: WAIT_NODE_TYPE,
				parameters: { resume: 'form' },
			});

			setWaitingExecution(store, node);

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBe(
				'The node is waiting for a form submission',
			);
		});

		it('returns the user-input message for sendAndWait operations', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({
				id: 'send-1',
				name: 'Send',
				parameters: { operation: SEND_AND_WAIT_OPERATION },
			});

			setWaitingExecution(store, node);

			expect(store.executionWaitingByNodeId.get('send-1')?.value).toBe(
				'The node is waiting for user input',
			);
		});

		it('returns the form message for form nodes', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'form-1', name: 'Form', type: FORM_NODE_TYPE });

			setWaitingExecution(store, node);

			expect(store.executionWaitingByNodeId.get('form-1')?.value).toBe(
				'The node is waiting for a form submission',
			);
		});

		it('returns the indefinite message when waiting indefinitely', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'wait-1', name: 'Wait', type: WAIT_NODE_TYPE });

			setWaitingExecution(store, node, {
				...({ waitTill: WAIT_INDEFINITELY } as Partial<IExecutionResponse>),
			});

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBe(
				'The node is waiting for an incoming webhook call (indefinitely)',
			);
		});

		it('returns a dated message for a timed wait', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'wait-1', name: 'Wait', type: WAIT_NODE_TYPE });

			setWaitingExecution(store, node);

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toMatch(
				/^Node is waiting until /,
			);
		});

		it('returns undefined when the execution is finished', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'wait-1', name: 'Wait', type: WAIT_NODE_TYPE });

			setWaitingExecution(store, node, { finished: true });

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBeUndefined();
		});

		it('returns undefined when the node is not the last node executed', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'wait-1', name: 'Wait', type: WAIT_NODE_TYPE });

			setWaitingExecution(store, node, { lastNodeExecuted: 'Another Node' } as never);

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBeUndefined();
		});

		it('returns undefined when the execution has no waitTill', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'wait-1', name: 'Wait', type: WAIT_NODE_TYPE });

			setExecutionWithSnapshot(store, {
				nodes: [node],
				lastNodeExecuted: node.name,
				finished: false,
			});

			expect(store.executionWaitingByNodeId.get('wait-1')?.value).toBeUndefined();
		});
	});

	describe('executionRunDataOutputMapByNodeId', () => {
		// The rebuild runs behind a throttledWatch whose leading slot is consumed
		// by the `immediate: true` run at store creation, so a setExecution right
		// after creation lands on the trailing edge. Fake timers let tests skip
		// the throttle window deterministically.
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		async function flushOutputMapRebuild() {
			// Let the (pre-flush) watcher run, then fire the trailing throttle slot.
			await nextTick();
			vi.advanceTimersByTime(CANVAS_EXECUTION_DATA_THROTTLE_DURATION);
		}

		function createTask(
			items: number,
			overrides: Record<string, unknown> = {},
			connectionType: string = NodeConnectionTypes.Main,
		) {
			return {
				startTime: 0,
				executionTime: 0,
				executionIndex: 0,
				source: [],
				data: {
					[connectionType]: [Array.from({ length: items }, () => ({ json: {} }))],
				},
				...overrides,
			};
		}

		it('is empty when there is no run data', () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			expect(store.executionRunDataOutputMapByNodeId.size).toBe(0);
		});

		it('calculates iterations and total for a single node', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'node-1', name: 'Node 1' });

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: { 'Node 1': [createTask(2)] },
			});
			await flushOutputMapRebuild();

			expect(store.executionRunDataOutputMapByNodeId.get('node-1')).toEqual({
				[NodeConnectionTypes.Main]: { 0: { iterations: 1, total: 2 } },
			});
		});

		it('aggregates multiple iterations', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'node-1', name: 'Node 1' });

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [
						createTask(1),
						createTask(3, { executionIndex: 1 }),
						createTask(2, { executionIndex: 2 }),
					],
				},
			});
			await flushOutputMapRebuild();

			expect(store.executionRunDataOutputMapByNodeId.get('node-1')).toEqual({
				[NodeConnectionTypes.Main]: { 0: { iterations: 3, total: 6 } },
			});
		});

		it('does not count canceled iterations but still counts their data', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'node-1', name: 'Node 1' });

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [
						createTask(2, { executionStatus: 'success' }),
						createTask(3, { executionStatus: 'canceled', executionIndex: 1 }),
						createTask(1, { executionStatus: 'success', executionIndex: 2 }),
					],
				},
			});
			await flushOutputMapRebuild();

			expect(store.executionRunDataOutputMapByNodeId.get('node-1')).toEqual({
				[NodeConnectionTypes.Main]: { 0: { iterations: 2, total: 6 } },
			});
		});

		it('reports zero iterations when all iterations are canceled', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const node = createTestNode({ id: 'node-1', name: 'Node 1' });

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [
						createTask(2, { executionStatus: 'canceled' }),
						createTask(1, { executionStatus: 'canceled', executionIndex: 1 }),
					],
				},
			});
			await flushOutputMapRebuild();

			expect(store.executionRunDataOutputMapByNodeId.get('node-1')).toEqual({
				[NodeConnectionTypes.Main]: { 0: { iterations: 0, total: 3 } },
			});
		});

		it('populates byTarget per-target counts for non-main connections', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const modelNode = createTestNode({ id: 'model-1', name: 'OpenAI Chat Model' });
			const agent1Node = createTestNode({ id: 'agent-1', name: 'AI Agent 1' });
			const agent2Node = createTestNode({ id: 'agent-2', name: 'AI Agent 2' });

			setExecutionWithSnapshot(store, {
				nodes: [modelNode, agent1Node, agent2Node],
				runData: {
					'OpenAI Chat Model': [
						createTask(
							2,
							{ executionStatus: 'success', source: [{ previousNode: 'AI Agent 1' }] },
							NodeConnectionTypes.AiLanguageModel,
						),
						createTask(
							1,
							{
								executionStatus: 'success',
								executionIndex: 1,
								source: [{ previousNode: 'AI Agent 2' }],
							},
							NodeConnectionTypes.AiLanguageModel,
						),
						createTask(
							3,
							{
								executionStatus: 'success',
								executionIndex: 2,
								source: [{ previousNode: 'AI Agent 1' }],
							},
							NodeConnectionTypes.AiLanguageModel,
						),
					],
				},
			});
			await flushOutputMapRebuild();

			const outputData =
				store.executionRunDataOutputMapByNodeId.get('model-1')?.[
					NodeConnectionTypes.AiLanguageModel
				]?.[0];

			expect(outputData?.iterations).toBe(3);
			expect(outputData?.total).toBe(6);
			// Agent 1 was called twice with 2 + 3 = 5 items; agent 2 once with 1.
			expect(outputData?.byTarget?.['agent-1']).toEqual({ iterations: 2, total: 5 });
			expect(outputData?.byTarget?.['agent-2']).toEqual({ iterations: 1, total: 1 });
		});

		it('counts items inside the response field for non-main connections', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));
			const embeddingNode = createTestNode({ id: 'embed-1', name: 'Embeddings OpenAI' });
			const vectorStoreNode = createTestNode({ id: 'vector-1', name: 'Vector Store' });

			setExecutionWithSnapshot(store, {
				nodes: [embeddingNode, vectorStoreNode],
				runData: {
					'Embeddings OpenAI': [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							executionStatus: 'success',
							source: [{ previousNode: 'Vector Store' }],
							data: {
								[NodeConnectionTypes.AiEmbedding]: [
									[
										{
											json: {
												response: [
													{ embedding: [0.1, 0.2] },
													{ embedding: [0.3, 0.4] },
													{ embedding: [0.5, 0.6] },
												],
											},
										},
									],
								],
							},
						},
					],
				},
			});
			await flushOutputMapRebuild();

			const outputData =
				store.executionRunDataOutputMapByNodeId.get('embed-1')?.[
					NodeConnectionTypes.AiEmbedding
				]?.[0];

			// Counts the 3 items inside `response`, not the 1 wrapper item — also
			// for the per-target counts.
			expect(outputData?.iterations).toBe(1);
			expect(outputData?.total).toBe(3);
			expect(outputData?.byTarget?.['vector-1']).toEqual({ iterations: 1, total: 3 });
		});
	});

	describe('executionIssuesByNodeId', () => {
		const node = createTestNode({ id: 'node-1', name: 'Node 1' });

		it('returns the issues recorded under the node name', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [{ error: { message: 'Boom' } }],
				},
			});
			await flushPromises();

			expect(store.executionIssuesByNodeId.get('node-1')?.value).toEqual(['Boom']);
		});

		it('has no entry for an id the execution never ran', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [{ error: { message: 'Boom' } }],
				},
			});
			await flushPromises();

			// A node added after the run: its name may match, its id cannot.
			expect(store.executionIssuesByNodeId.get('node-added-later')).toBeUndefined();
		});

		it('follows a renamed node, because the snapshot is renamed with it', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			setExecutionWithSnapshot(store, {
				nodes: [node],
				runData: {
					'Node 1': [{ error: { message: 'Boom' } }],
				},
			});
			await flushPromises();

			store.renameExecutionDataNode('Node 1', 'Renamed');
			await flushPromises();

			expect(store.executionIssuesByNodeId.get('node-1')?.value).toEqual(['Boom']);
		});
	});

	describe('executionPinDataByNodeId', () => {
		const node = createTestNode({ id: 'node-1', name: 'Node 1' });

		it('returns the pin data recorded under the node name', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.setExecution(
				createTestExecution({
					workflowData: createTestWorkflow({ nodes: [node] }),
					data: {
						resultData: {
							runData: {},
							pinData: { 'Node 1': [{ json: { pinned: true } }] },
						},
					} as never,
				}),
			);
			await flushPromises();

			expect(store.executionPinDataByNodeId.get('node-1')?.value).toEqual([
				{ json: { pinned: true } },
			]);
		});

		it('has no entry for an id the execution never ran', async () => {
			const store = useExecutionDataStore(createExecutionDataId('exec-1'));

			store.setExecution(
				createTestExecution({
					workflowData: createTestWorkflow({ nodes: [node] }),
					data: {
						resultData: {
							runData: {},
							pinData: { 'Node 1': [{ json: { pinned: true } }] },
						},
					} as never,
				}),
			);
			await flushPromises();

			expect(store.executionPinDataByNodeId.get('node-added-later')).toBeUndefined();
		});
	});
});

async function flushPromises() {
	await new Promise((resolve) => setTimeout(resolve, 0));
}
