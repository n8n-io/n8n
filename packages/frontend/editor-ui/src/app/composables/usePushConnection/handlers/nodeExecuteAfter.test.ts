import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfter } from './nodeExecuteAfter';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

describe('nodeExecuteAfter', () => {
	let mockOptions: { workflowState: Mocked<WorkflowState> };
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: false,
		});

		setActivePinia(pinia);
		vi.spyOn(useAssistantStore(), 'onNodeExecution').mockResolvedValue();

		mockOptions = {
			workflowState: mock<WorkflowState>({
				executingNode: {
					removeExecutingNode: vi.fn(),
				},
			}),
		};
	});

	function seedExecution() {
		const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-1'));
		executionDataStore.setExecution(
			createTestWorkflowExecutionResponse({
				id: 'exec-1',
				workflowData: createTestWorkflow({
					nodes: [createTestNode({ name: 'Test Node' })],
				}),
			}),
		);

		return executionDataStore;
	}

	it('should update node execution data with placeholder and remove executing node', async () => {
		const executionDataStore = seedExecution();
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

		// Verify the placeholder data structure
		expect(executionDataStore.executionRunData?.['Test Node'][0].data).toEqual({
			main: [
				Array.from({ length: 2 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
	});

	it('should handle multiple connection types', async () => {
		const executionDataStore = seedExecution();

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

		expect(executionDataStore.executionRunData?.['Test Node'][0].data).toEqual({
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
		const executionDataStore = seedExecution();

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

		expect(executionDataStore.executionRunData?.['Test Node'][0].data).toEqual({
			main: [],
		});
	});

	it('should preserve original data structure except for data property', async () => {
		const executionDataStore = seedExecution();

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

		const taskData = executionDataStore.executionRunData?.['Test Node'][0];
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
		const executionDataStore = seedExecution();

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

		// Should only contain main connection, invalid_connection should be filtered out
		expect(executionDataStore.executionRunData?.['Test Node'][0].data).toEqual({
			main: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
		expect(
			executionDataStore.executionRunData?.['Test Node'][0].data?.invalid_connection,
		).toBeUndefined();
	});
});
