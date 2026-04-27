import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nodeExecuteAfter } from './nodeExecuteAfter';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { mockedStore } from '@/__tests__/utils';
import type { NodeExecuteAfter } from '@n8n/api-types/push/execution';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { mock } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

const workflowHelpersMock = vi.hoisted(() => ({
	getWorkflowDataToSave: vi.fn(),
	getNodeTypes: vi.fn(),
}));

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => workflowHelpersMock,
}));

describe('nodeExecuteAfter', () => {
	let mockOptions: { workflowState: Mocked<WorkflowState> };
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	beforeEach(() => {
		const pinia = createTestingPinia({
			stubActions: true,
		});

		setActivePinia(pinia);
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('test-workflow'));
		vi.spyOn(workflowDocumentStore, 'updateNodeExecutionStatus');

		mockOptions = {
			workflowState: mock<WorkflowState>({
				getCurrentWorkflowDocumentStore: vi.fn(() => workflowDocumentStore),
				executingNode: {
					removeExecutingNode: vi.fn(),
				},
			}),
		};
	});

	it('should update node execution data with placeholder and remove executing node', async () => {
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

		expect(workflowDocumentStore.updateNodeExecutionStatus).toHaveBeenCalledTimes(1);
		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledTimes(1);
		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledWith(
			'Test Node',
		);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledTimes(1);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledWith(event.data);

		// Verify the placeholder data structure
		const updateCall = vi.mocked(workflowDocumentStore.updateNodeExecutionStatus).mock.calls[0][0];
		expect(updateCall.data.data).toEqual({
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

		const updateCall = vi.mocked(workflowDocumentStore.updateNodeExecutionStatus).mock.calls[0][0];
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

		const updateCall = vi.mocked(workflowDocumentStore.updateNodeExecutionStatus).mock.calls[0][0];
		expect(updateCall.data.data).toEqual({
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

		const updateCall = vi.mocked(workflowDocumentStore.updateNodeExecutionStatus).mock.calls[0][0];
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

		const updateCall = vi.mocked(workflowDocumentStore.updateNodeExecutionStatus).mock.calls[0][0];
		// Should only contain main connection, invalid_connection should be filtered out
		expect(updateCall.data.data).toEqual({
			main: [
				Array.from({ length: 1 }).fill({ json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true } }),
			],
		});
		expect(updateCall.data.data?.invalid_connection).toBeUndefined();
	});

	it('should not block cleanup when telemetry tracking fails', async () => {
		const assistantStore = mockedStore(useAssistantStore);
		workflowHelpersMock.getWorkflowDataToSave.mockRejectedValueOnce(
			new Error('telemetry snapshot failed'),
		);

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
					source: [],
					error: new Error('Node failed') as never,
				},
			},
		};

		await expect(nodeExecuteAfter(event, mockOptions)).resolves.toBeUndefined();

		expect(mockOptions.workflowState.executingNode.removeExecutingNode).toHaveBeenCalledWith(
			'Test Node',
		);
		expect(assistantStore.onNodeExecution).toHaveBeenCalledWith(event.data);
		expect(workflowHelpersMock.getWorkflowDataToSave).toHaveBeenCalled();
	});
});
