import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PushPayload } from '@n8n/api-types';
import {
	createEmptyRunExecutionData,
	createRunExecutionData,
	NodeConnectionTypes,
	type IRunData,
	type IRunExecutionData,
	type ITaskData,
} from 'n8n-workflow';

import {
	createExecutionDataId,
	disposeExecutionDataStore,
	getActiveExecutionDataStore,
	getExecutionDataStoreId,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { STORES } from '@n8n/stores';

const { openFormPopupWindow } = vi.hoisted(() => ({
	openFormPopupWindow: vi.fn(),
}));

vi.mock('@/features/execution/executions/executions.utils', () => {
	return {
		openFormPopupWindow,
	};
});

function createPairedRunData(): IRunData {
	return {
		Start: [
			createTestTaskData({
				executionIndex: 0,
				data: { main: [[{ json: { value: 'start' }, pairedItem: { item: 0 } }]] },
			}),
		],
		Child: [
			createTestTaskData({
				executionIndex: 0,
				source: [{ previousNode: 'Start', previousNodeOutput: 0, previousNodeRun: 0 }],
				data: { main: [[{ json: { value: 'child' }, pairedItem: { item: 0 } }]] },
			}),
		],
	};
}

function createExecution(
	id: string,
	data: IRunExecutionData = createRunExecutionData({
		resultData: { runData: createPairedRunData(), lastNodeExecuted: 'Child' },
	}),
	overrides: Partial<IExecutionResponse> = {},
): IExecutionResponse {
	return createTestWorkflowExecutionResponse({
		id,
		executedNode: 'Child',
		triggerNode: 'Start',
		workflowData: createTestWorkflow({
			nodes: [createTestNode({ name: 'Start' }), createTestNode({ name: 'Child' })],
			connections: {
				Start: {
					main: [[{ node: 'Child', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		}),
		data,
		...overrides,
	});
}

function createPushData(
	nodeName: string,
	data: ITaskData,
	executionId = 'exec-1',
): PushPayload<'nodeExecuteAfterData'> {
	return {
		executionId,
		nodeName,
		data,
		itemCountByConnectionType: { main: [1] },
	};
}

describe('executionData.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.setSystemTime(new Date('2026-04-28T10:00:00.000Z'));
		openFormPopupWindow.mockReset();
	});

	it('creates stores keyed by execution id', () => {
		expect(createExecutionDataId('exec-1')).toBe('exec-1');
		expect(getExecutionDataStoreId('exec-1')).toBe(`${STORES.EXECUTION_DATA}/exec-1`);

		const firstStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		const secondStore = useExecutionDataStore(createExecutionDataId('exec-2'));

		firstStore.setExecution(createExecution('exec-1'));
		secondStore.setExecution(
			createExecution('exec-2', createEmptyRunExecutionData(), {
				executedNode: 'Start',
			}),
		);

		expect(firstStore.execution?.id).toBe('exec-1');
		expect(firstStore.executedNode).toBe('Child');
		expect(secondStore.execution?.id).toBe('exec-2');
		expect(secondStore.executedNode).toBe('Start');

		firstStore.resetExecutionData();

		expect(firstStore.execution).toBeNull();
		expect(secondStore.execution?.id).toBe('exec-2');
	});

	it('sets execution data and computes derived state', () => {
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));
		store.addNodeExecutionStartedData({
			executionId: 'exec-1',
			nodeName: 'Child',
			data: { startTime: 1, executionIndex: 0, source: [] },
		});

		store.setExecution(createExecution('exec-1'));

		expect(store.executionRunData?.Child).toHaveLength(1);
		expect(store.executedNode).toBe('Child');
		expect(store.executionStartedData).toBeUndefined();
		expect(store.executionResultDataLastUpdate).toBe(Date.now());
		expect(store.executionPairedItemMappings.Start_r0_o0_i0).toEqual(new Set(['Child_r0_o0_i0']));
	});

	it('updates full run data and clears started data', () => {
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));
		store.setExecution(createExecution('exec-1', createEmptyRunExecutionData()));
		store.addNodeExecutionStartedData({
			executionId: 'exec-1',
			nodeName: 'Start',
			data: { startTime: 1, executionIndex: 0, source: [] },
		});

		store.setExecutionRunData(
			createRunExecutionData({ resultData: { runData: createPairedRunData() } }),
		);

		expect(store.executionRunData?.Child).toHaveLength(1);
		expect(store.executionStartedData).toBeUndefined();
		expect(store.executionPairedItemMappings.Child_r0_o0_i0).toEqual(new Set(['Start_r0_o0_i0']));
	});

	it('appends and replaces node execution push data and preserves redaction info', () => {
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));
		store.setExecution(createExecution('exec-1', createEmptyRunExecutionData()));

		store.updateNodeExecutionStatus(
			createPushData(
				'Child',
				createTestTaskData({
					executionStatus: 'waiting',
					metadata: { resumeFormUrl: 'https://example.test/form' },
				}),
			),
		);
		store.updateNodeExecutionStatus(
			createPushData(
				'Child',
				createTestTaskData({
					executionStatus: 'success',
					executionTime: 10,
					data: {
						main: [
							[
								{
									json: { value: 'redacted' },
									redaction: { redacted: true, reason: 'policy' },
								},
							],
						],
					},
				}),
			),
		);
		store.updateNodeExecutionStatus(
			createPushData(
				'Child',
				createTestTaskData({
					executionIndex: 1,
					executionStatus: 'success',
					executionTime: 20,
				}),
			),
		);
		store.updateNodeExecutionRunData(
			createPushData(
				'Child',
				createTestTaskData({
					executionIndex: 1,
					executionStatus: 'success',
					executionTime: 30,
				}),
			),
		);

		expect(openFormPopupWindow).toHaveBeenCalledWith('https://example.test/form');
		expect(store.executionRunData?.Child).toHaveLength(2);
		expect(store.executionRunData?.Child[0].executionStatus).toBe('success');
		expect(store.executionRunData?.Child[0].executionTime).toBe(10);
		expect(store.executionRunData?.Child[1].executionIndex).toBe(1);
		expect(store.executionRunData?.Child[1].executionTime).toBe(30);
		expect(store.execution?.data?.redactionInfo).toEqual({
			isRedacted: true,
			reason: 'policy',
			canReveal: false,
		});
	});

	it('clears node execution data and recomputes paired mappings', () => {
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));
		store.setExecution(createExecution('exec-1'));

		store.clearNodeExecutionData('Child');

		expect(store.executionRunData?.Child).toBeUndefined();
		expect(store.executionRunData?.Start).toHaveLength(1);
		expect(store.executionPairedItemMappings).toEqual({});
	});

	it('renames node references in execution and workflow data', () => {
		const runData = createPairedRunData();
		runData.Child[0].source = [{ previousNode: 'Start' }];
		const execution = createExecution(
			'exec-1',
			createRunExecutionData({
				resultData: {
					lastNodeExecuted: 'Start',
					runData,
					pinData: {
						Start: [{ json: { pinned: true } }],
						Child: [
							{
								json: { pinned: 'child' },
								pairedItem: { item: 0, sourceOverwrite: { previousNode: 'Start' } },
							},
						],
					},
				},
			}),
			{
				executedNode: 'Start',
				triggerNode: 'Start',
			},
		);
		execution.workflowData.pinData = {
			Start: [{ json: { workflowPin: true } }],
			Child: [
				{
					json: { workflowPin: 'child' },
					pairedItem: { item: 0, sourceOverwrite: { previousNode: 'Start' } },
				},
			],
		};
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));
		store.setExecution(execution);

		store.renameExecutionDataNode('Start', 'Renamed Start');

		expect(store.executionRunData?.Start).toBeUndefined();
		expect(store.executionRunData?.['Renamed Start']).toHaveLength(1);
		expect(store.executionRunData?.Child[0].source?.[0]?.previousNode).toBe('Renamed Start');
		expect(store.execution?.data?.resultData.pinData?.['Renamed Start']).toHaveLength(1);
		expect(store.execution?.data?.resultData.pinData?.Child[0].pairedItem).toMatchObject({
			sourceOverwrite: { previousNode: 'Renamed Start' },
		});
		expect(store.execution?.workflowData.nodes.map((node) => node.name)).toContain('Renamed Start');
		expect(store.execution?.workflowData.connections['Renamed Start']).toBeDefined();
		const renamedConnection =
			store.execution?.workflowData.connections['Renamed Start']?.main[0]?.[0];
		expect(renamedConnection?.node).toBe('Child');
		expect(store.execution?.workflowData.pinData?.['Renamed Start']).toHaveLength(1);
		expect(store.execution?.executedNode).toBe('Renamed Start');
		expect(store.execution?.triggerNode).toBe('Renamed Start');
		expect(store.execution?.data?.resultData.lastNodeExecuted).toBe('Renamed Start');
		expect(store.executionPairedItemMappings.Start_r0_o0_i0).toBeUndefined();
		expect(store.executionPairedItemMappings['Renamed Start_r0_o0_i0']).toBeUndefined();
	});

	it('disposes only the targeted execution store', () => {
		const firstStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		const secondStore = useExecutionDataStore(createExecutionDataId('exec-2'));
		firstStore.setExecution(createExecution('exec-1'));
		secondStore.setExecution(createExecution('exec-2'));

		expect(getActiveExecutionDataStore({ value: firstStore })).toBe(firstStore);
		expect(getActiveExecutionDataStore({ value: undefined })).toBeNull();

		disposeExecutionDataStore(createExecutionDataId('exec-1'));

		expect(secondStore.execution?.id).toBe('exec-2');
		expect(useExecutionDataStore(createExecutionDataId('exec-1')).execution).toBeNull();
	});
});
