import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createRunExecutionData, type ITaskData } from 'n8n-workflow';
import { disposeExecutionDataStore, useExecutionDataStore } from '@/app/stores/executionData.store';
import {
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { getPairedItemId } from '@/app/utils/pairedItemUtils';

function createExecution(runData: Record<string, ITaskData[]> = {}) {
	return createTestWorkflowExecutionResponse({
		id: 'execution-1',
		workflowData: createTestWorkflow({ id: 'wf-1', nodes: [] }),
		finished: false,
		status: 'running',
		data: createRunExecutionData({
			resultData: {
				runData,
				pinData: {},
			},
		}),
	});
}

describe('executionData.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.spyOn(Date, 'now').mockReturnValue(123456789);
	});

	it('isolates execution data by execution id', () => {
		const first = useExecutionDataStore('execution-1');
		const second = useExecutionDataStore('execution-2');

		first.setExecution(createExecution({ A: [createTestTaskData()] }));

		expect(first.executionRunData?.A).toHaveLength(1);
		expect(second.execution).toBeNull();
	});

	it('stores execution data and paired item mappings', () => {
		const sourceTask: ITaskData = {
			...createTestTaskData(),
			startTime: 1,
			executionIndex: 0,
			executionTime: 0,
			source: [],
			executionStatus: 'success',
			data: { main: [[{ json: { source: true }, pairedItem: { item: 0 } }]] },
		};
		const targetTask: ITaskData = {
			...createTestTaskData(),
			startTime: 2,
			executionIndex: 1,
			executionTime: 1,
			source: [{ previousNode: 'Source' }],
			executionStatus: 'success',
			data: { main: [[{ json: { downstream: true }, pairedItem: { item: 0 } }]] },
		};
		const store = useExecutionDataStore('execution-1');

		store.setExecution(createExecution({ Source: [sourceTask], Target: [targetTask] }));

		expect(store.executionRunData?.Source).toEqual([sourceTask]);
		expect(store.executionResultDataLastUpdate).toBe(123456789);
		const sourceItemId = getPairedItemId('Source', 0, 0, 0);
		const targetItemId = getPairedItemId('Target', 0, 0, 0);
		expect(
			store.executionPairedItemMappings[sourceItemId]?.has(targetItemId) ??
				store.executionPairedItemMappings[targetItemId]?.has(sourceItemId),
		).toBe(true);
	});

	it('updates node execution status and redaction info', () => {
		const store = useExecutionDataStore('execution-1');
		store.setExecution(createExecution());

		store.updateNodeExecutionStatus({
			executionId: 'execution-1',
			nodeName: 'A',
			itemCountByConnectionType: {},
			data: createTestTaskData({
				executionStatus: 'success',
				data: {
					main: [[{ json: {}, redaction: { redacted: true, reason: 'dynamic_credentials' } }]],
				},
			}),
		});

		expect(store.executionRunData?.A).toHaveLength(1);
		expect(store.execution?.data?.resultData.lastNodeExecuted).toBe('A');
		expect(store.execution?.data?.redactionInfo).toEqual({
			isRedacted: true,
			reason: 'dynamic_credentials',
			canReveal: false,
		});
	});

	it('clears and renames node execution data', () => {
		const store = useExecutionDataStore('execution-1');
		store.setExecution(createExecution({ Old: [createTestTaskData()] }));
		store.addNodeExecutionStartedData({
			executionId: 'execution-1',
			nodeName: 'Old',
			data: { startTime: 1, executionIndex: 0, source: [] },
		});

		store.renameExecutionDataNode('Old', 'New');

		expect(store.executionRunData?.Old).toBeUndefined();
		expect(store.executionRunData?.New).toHaveLength(1);
		expect(store.executionStartedData?.[1].New).toHaveLength(1);

		store.clearNodeExecutionData('New');
		expect(store.executionRunData?.New).toBeUndefined();
	});

	it('disposes only the targeted execution store', () => {
		const first = useExecutionDataStore('execution-1');
		const second = useExecutionDataStore('execution-2');
		first.setExecution(createExecution());
		second.setExecution(createExecution());

		disposeExecutionDataStore('execution-1');

		expect(useExecutionDataStore('execution-1').execution).toBeNull();
		expect(useExecutionDataStore('execution-2').execution).not.toBeNull();
	});
});
