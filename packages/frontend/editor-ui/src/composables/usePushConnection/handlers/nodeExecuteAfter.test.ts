import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfter } from './nodeExecuteAfter';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { mockedStore } from '@/__tests__/utils';
import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { WorkflowState } from '@/composables/useWorkflowState';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';

describe('nodeExecuteAfter', () => {
	let mockOptions: { workflowState: Mocked<WorkflowState> };
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: true,
		});

		setActivePinia(pinia);

		mockOptions = {
			workflowState: mock<WorkflowState>({
				executingNode: {
					removeExecutingNode: vi.fn(),
				},
			}),
		};
	});

	it('should update node execution data with placeholder and remove executing node', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		const assistantStore = mockedStore(useAssistantStore);

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

		expect(workflowsStore.updateNodeExecutionStatus).toHaveBeenCalledTimes(1);
		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledTimes(1);
		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledWith(
			'Test Node',
		);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledTimes(1);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledWith(event.data);

		// Verify the placeholder data structure
		const updateCall = workflowsStore.updateNodeExecutionStatus.mock.calls[0][0];
		expect(updateCall.data.data).toEqual({
			main: [
				Array.from({ length: 2 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
	});

	it('should handle multiple connection types', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);

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

		const updateCall = workflowsStore.updateNodeExecutionStatus.mock.calls[0][0];
		expect(updateCall.data.data).toEqual({
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
		const workflowsStore = mockedStore(useWorkflowsStore);

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

		const updateCall = workflowsStore.updateNodeExecutionStatus.mock.calls[0][0];
		expect(updateCall.data.data).toEqual({
			main: [],
		});
	});

	it('should preserve original data structure except for data property', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);

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

		const updateCall = workflowsStore.updateNodeExecutionStatus.mock.calls[0][0];
		expect(updateCall.executionId).toBe('exec-1');
		expect(updateCall.nodeName).toBe('Test Node');
		expect(updateCall.data.executionTime).toBe(100);
		expect(updateCall.data.startTime).toBe(1234567890);
		expect(updateCall.data.executionIndex).toBe(0);
		expect(updateCall.data.source).toEqual([null]);

		// Only the data property should be replaced with placeholder
		expect(updateCall.data.data).toEqual({
			main: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
	});

	it('should filter out invalid connection types', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);

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

		const updateCall = workflowsStore.updateNodeExecutionStatus.mock.calls[0][0];
		// Should only contain main connection, invalid_connection should be filtered out
		expect(updateCall.data.data).toEqual({
			main: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
		expect(updateCall.data.data?.invalid_connection).toBeUndefined();
	});
});
