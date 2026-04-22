import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/app/composables/useWorkflowState';
import { useExecutionDebugging } from './useExecutionDebugging';
import type { INodeUi } from '@/Interface';
import type { IExecutionResponse } from '../executions.types';
import { useToast } from '@/app/composables/useToast';

vi.mock('@/app/composables/useToast', () => {
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showToast,
		}),
	};
});

vi.mock('@/app/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/app/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

const { mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockWorkflowDocumentStore: {
		getNodes: vi.fn().mockReturnValue([]),
		getParentNodes: vi.fn().mockReturnValue([]),
		pinNodeData: vi.fn(),
		clearPinnedDataTimestamps: vi.fn(),
		resetAllNodesIssues: vi.fn(),
		getPinDataSnapshot: vi.fn().mockReturnValue({}),
		pinData: {},
		settings: {},
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn().mockReturnValue(mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
}));

let workflowState: WorkflowState;
let executionDebugging: ReturnType<typeof useExecutionDebugging>;
let toast: ReturnType<typeof useToast>;

describe('useExecutionDebugging()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();

		mockWorkflowDocumentStore.getNodes.mockReturnValue([]);
		mockWorkflowDocumentStore.getParentNodes.mockReturnValue([]);

		const workflowStore = mockedStore(useWorkflowsStore);
		workflowStore.workflow.id = 'test-workflow';

		toast = useToast();

		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		executionDebugging = useExecutionDebugging();
	});

	it('should not throw when runData node is an empty array', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						testNode: [],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.getNodes.mockReturnValue([{ name: 'testNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await expect(executionDebugging.applyExecutionData('1')).resolves.not.toThrowError();
	});

	it('should pin binary data correctly during debug restoration', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						TriggerNode: [
							{
								data: {
									main: [
										[
											{
												json: { test: 'data' },
												binary: {
													data: {
														fileName: 'test.txt',
														mimeType: 'text/plain',
														data: 'dGVzdCBkYXRh',
													},
												},
											},
										],
									],
								},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.getNodes.mockReturnValue([{ name: 'TriggerNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(mockWorkflowDocumentStore.pinNodeData).toHaveBeenCalledWith('TriggerNode', [
			{
				json: { test: 'data' },
				binary: {
					data: {
						fileName: 'test.txt',
						mimeType: 'text/plain',
						data: 'dGVzdCBkYXRh',
					},
				},
			},
		]);
	});

	it('should handle nodes with multiple main outputs during debug restoration', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						TriggerNode: [
							{
								data: {
									main: [
										[], // Empty first output
										[{ json: { test: 'data' } }], // Data in second output
									],
								},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.getNodes.mockReturnValue([{ name: 'TriggerNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(mockWorkflowDocumentStore.pinNodeData).toHaveBeenCalledWith('TriggerNode', [
			{ json: { test: 'data' } },
		]);
	});

	it('should show missing nodes warning toast', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						testNode: [
							{
								data: {},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.getNodes.mockReturnValue([{ name: 'testNode2' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

		await executionDebugging.applyExecutionData('1');

		expect(setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
		expect(toast.showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));
		expect(toast.showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
	});

	it('should applyExecutionData', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						testNode: [
							{
								data: {},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.getNodes.mockReturnValue([{ name: 'testNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

		await executionDebugging.applyExecutionData('1');

		expect(setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
		expect(toast.showToast).toHaveBeenCalledTimes(1);
	});

	it('should mark workflow as dirty after pinning imported execution data', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						TriggerNode: [
							{
								data: {
									main: [[{ json: { id: '1' } }, { json: { id: '2' } }]],
								},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		const uiStore = mockedStore(useUIStore);
		mockWorkflowDocumentStore.getNodes.mockReturnValue([{ name: 'TriggerNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(uiStore.markStateDirty).toHaveBeenCalledTimes(1);
	});
});
