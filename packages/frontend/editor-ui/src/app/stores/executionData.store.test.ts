import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import {
	useExecutionDataStore,
	createExecutionDataId,
	getExecutionDataStoreId,
	disposeExecutionDataStore,
} from '@/app/stores/executionData.store';
import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

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
});
