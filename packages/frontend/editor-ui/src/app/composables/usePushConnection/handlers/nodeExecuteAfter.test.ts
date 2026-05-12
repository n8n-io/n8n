import { createPinia, setActivePinia } from 'pinia';
import { nodeExecuteAfter } from './nodeExecuteAfter';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { createTestWorkflow, createTestWorkflowExecutionResponse } from '@/__tests__/mocks';

vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: vi.fn().mockReturnValue({
		onNodeExecution: vi.fn(),
	}),
}));

vi.mock('@/features/execution/executions/executions.utils', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/execution/executions/executions.utils')>();
	return { ...actual, openFormPopupWindow: vi.fn() };
});

import { openFormPopupWindow } from '@/features/execution/executions/executions.utils';

describe('nodeExecuteAfter', () => {
	let mockOptions: { workflowState: Mocked<WorkflowState> };
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let stateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
	let executionDataStore: ReturnType<typeof useExecutionDataStore>;

	beforeEach(() => {
		vi.mocked(openFormPopupWindow).mockClear();
		setActivePinia(createPinia());

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('test-wf');

		stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId('test-wf'));

		executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		executionDataStore.setExecution(
			createTestWorkflowExecutionResponse({
				id: 'exec-1',
				finished: false,
				status: 'running',
				workflowData: createTestWorkflow({ id: 'test-wf', name: 'Test' }),
			}),
		);

		stateStore.setActiveExecutionId('exec-1');

		mockOptions = {
			workflowState: mock<WorkflowState>({
				executingNode: {
					removeExecutingNode: vi.fn(),
				},
			}),
		};
	});

	it('should update node execution data with placeholder and remove executing node', async () => {
		const assistantStore = useAssistantStore();

		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCountByConnectionType: { main: [2, 1] },
				data: {
					executionTime: 100,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledTimes(1);
		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledWith(
			'Test Node',
		);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledTimes(1);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledWith(event.data);

		// Verify the placeholder data structure written to the execution data store
		const runData = executionDataStore.execution?.data?.resultData.runData;
		expect(runData?.['Test Node']).toHaveLength(1);
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [
				Array.from({ length: 2 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
	});

	it('should handle multiple connection types', async () => {
		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCountByConnectionType: {
					main: [3],
					ai_memory: [1, 2],
					ai_tool: [1],
				},
				data: {
					executionTime: 100,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		const runData = executionDataStore.execution?.data?.resultData.runData;
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [
				Array.from({ length: 3 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
			ai_memory: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
				Array.from({ length: 2 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
			ai_tool: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
	});

	it('should handle empty itemCountByConnectionType', async () => {
		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCountByConnectionType: {},
				data: {
					executionTime: 100,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		const runData = executionDataStore.execution?.data?.resultData.runData;
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [],
		});
	});

	it('should preserve original data structure except for data property', async () => {
		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCountByConnectionType: { main: [1] },
				data: {
					executionTime: 100,
					startTime: 1234567890,
					executionIndex: 0,
					source: [null],
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		const runData = executionDataStore.execution?.data?.resultData.runData;
		const taskData = runData?.['Test Node'][0];
		expect(taskData?.executionTime).toBe(100);
		expect(taskData?.startTime).toBe(1234567890);
		expect(taskData?.executionIndex).toBe(0);
		expect(taskData?.source).toEqual([null]);

		// Only the data property should be replaced with placeholder
		expect(taskData?.data).toEqual({
			main: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
	});

	it('should filter out invalid connection types', async () => {
		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Test Node',
				itemCountByConnectionType: {
					main: [1],
					// @ts-expect-error Testing invalid connection type
					invalid_connection: [2], // This should be filtered out by isValidNodeConnectionType
				},
				data: {
					executionTime: 100,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		const runData = executionDataStore.execution?.data?.resultData.runData;
		// Should only contain main connection, invalid_connection should be filtered out
		expect(runData?.['Test Node'][0].data).toEqual({
			main: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
		expect(runData?.['Test Node'][0].data?.invalid_connection).toBeUndefined();
	});

	it('should open form popup when execution status is waiting and resumeFormUrl is present', async () => {
		const formUrl = 'http://localhost:5678/form-waiting/exec-1?signature=abc123';
		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Wait',
				itemCountByConnectionType: {},
				data: {
					executionTime: 0,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
					executionStatus: 'waiting',
					metadata: { resumeFormUrl: formUrl },
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		expect(openFormPopupWindow).toHaveBeenCalledWith(formUrl);
	});

	it('should not open form popup when resumeFormUrl is absent', async () => {
		const event: NodeExecuteAfter = {
			type: 'nodeExecuteAfter',
			data: {
				executionId: 'exec-1',
				nodeName: 'Wait',
				itemCountByConnectionType: {},
				data: {
					executionTime: 0,
					startTime: 1234567890,
					executionIndex: 0,
					source: [],
					executionStatus: 'waiting',
				},
			},
		};

		await nodeExecuteAfter(event, mockOptions);

		expect(openFormPopupWindow).not.toHaveBeenCalled();
	});
});
