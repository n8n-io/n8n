import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useExecutionDebugging } from './useExecutionDebugging';
import type { INodeUi } from '@/Interface';
import type { IExecutionResponse } from '../executions.types';
import { useToast } from '@/app/composables/useToast';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import { MODAL_CONFIRM } from '@/app/constants';

vi.mock('@/app/composables/useToast', () => {
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showToast,
		}),
	};
});

const { mockConfirm, mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockConfirm: vi.fn(),
	mockWorkflowDocumentStore: {
		documentId: 'test-id@latest',
		allNodes: [] as INodeUi[],
		workflowTriggerNodes: [] as INodeUi[],
		getParentNodes: vi.fn().mockReturnValue([]),
		pinNodeData: vi.fn(),
		unpinNodeData: vi.fn(),
		clearPinnedDataTimestamps: vi.fn(),
		resetAllNodesIssues: vi.fn(),
		getPinDataSnapshot: vi.fn().mockReturnValue({}),
		pinnedDataByNodeName: {},
		settings: {},
	} satisfies Partial<ReturnType<typeof useWorkflowDocumentStore>>,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn().mockReturnValue(mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
	injectWorkflowDocumentStore: () => ({ value: mockWorkflowDocumentStore }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
}));

let executionDebugging: ReturnType<typeof useExecutionDebugging>;
let toast: ReturnType<typeof useToast>;
let executionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;

describe('useExecutionDebugging()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();

		mockWorkflowDocumentStore.allNodes = [];
		mockWorkflowDocumentStore.getParentNodes.mockReturnValue([]);
		mockWorkflowDocumentStore.pinnedDataByNodeName = {};
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);

		const workflowStore = mockedStore(useWorkflowsStore);
		workflowStore.setWorkflowId('test-workflow');

		toast = useToast();

		// Production resolves the execution-state store by the injected document
		// store's `documentId` ('test-id@latest' on the mock above).
		executionStateStore = useWorkflowExecutionStateStore('test-id@latest');

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
		mockWorkflowDocumentStore.allNodes = [{ name: 'testNode' }] as INodeUi[];
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
		mockWorkflowDocumentStore.allNodes = [{ name: 'TriggerNode' }] as INodeUi[];
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
		mockWorkflowDocumentStore.allNodes = [{ name: 'TriggerNode' }] as INodeUi[];
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
		mockWorkflowDocumentStore.allNodes = [{ name: 'testNode2' }] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		const setWorkflowExecutionData = vi.spyOn(executionStateStore, 'setWorkflowExecutionData');

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
		mockWorkflowDocumentStore.allNodes = [{ name: 'testNode' }] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		const setWorkflowExecutionData = vi.spyOn(executionStateStore, 'setWorkflowExecutionData');

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
		mockWorkflowDocumentStore.allNodes = [{ name: 'TriggerNode' }] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(uiStore.markStateDirty).toHaveBeenCalledTimes(1);
	});

	it('should unpin workflow data that conflicts with execution pin data without restoring it', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						'When clicking Execute workflow': [
							{
								data: {
									main: [[{ json: { trigger: true } }]],
								},
							},
						],
					},
					pinData: {
						'HTTP Request': [{ json: { fromExecutionPinData: true } }],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		const uiStore = mockedStore(useUIStore);
		mockWorkflowDocumentStore.allNodes = [
			{ name: 'When clicking Execute workflow' },
			{ name: 'HTTP Request' },
		] as INodeUi[];
		mockWorkflowDocumentStore.getParentNodes.mockImplementation((nodeName: string) =>
			nodeName === 'HTTP Request' ? ['When clicking Execute workflow'] : [],
		);
		mockWorkflowDocumentStore.pinnedDataByNodeName = {
			'HTTP Request': [{ json: { existingWorkflowPin: true } }],
		};
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(mockConfirm).toHaveBeenCalled();
		expect(mockWorkflowDocumentStore.unpinNodeData).toHaveBeenCalledWith('HTTP Request');
		expect(mockWorkflowDocumentStore.pinNodeData).toHaveBeenCalledTimes(1);
		expect(mockWorkflowDocumentStore.pinNodeData).toHaveBeenCalledWith(
			'When clicking Execute workflow',
			[{ json: { trigger: true } }],
		);
		expect(mockWorkflowDocumentStore.pinNodeData).not.toHaveBeenCalledWith(
			'HTTP Request',
			expect.anything(),
		);
		expect(uiStore.markStateDirty).toHaveBeenCalledTimes(1);
	});

	it('should skip pinning nodes whose run data contains the trimmed-execution-data marker but still pin clean nodes', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						TrimmedTrigger: [
							{
								data: {
									main: [
										[
											{
												json: { [TRIMMED_TASK_DATA_CONNECTIONS_KEY]: true },
												pairedItem: { item: 0 },
											},
										],
									],
								},
							},
						],
						CleanTrigger: [
							{
								data: {
									main: [[{ json: { ok: true } }]],
								},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		mockWorkflowDocumentStore.allNodes = [
			{ name: 'TrimmedTrigger' },
			{ name: 'CleanTrigger' },
		] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(mockWorkflowDocumentStore.pinNodeData).toHaveBeenCalledTimes(1);
		expect(mockWorkflowDocumentStore.pinNodeData).toHaveBeenCalledWith('CleanTrigger', [
			{ json: { ok: true } },
		]);
		expect(mockWorkflowDocumentStore.pinNodeData).not.toHaveBeenCalledWith(
			'TrimmedTrigger',
			expect.anything(),
		);
	});

	it('should not mark workflow state dirty when nothing is pinned or unpinned', async () => {
		const mockExecution = {
			data: {
				resultData: {
					runData: {
						RenamedNode: [
							{
								data: {},
							},
						],
					},
				},
			},
		} as unknown as IExecutionResponse;

		const workflowStore = mockedStore(useWorkflowsStore);
		const uiStore = mockedStore(useUIStore);
		mockWorkflowDocumentStore.allNodes = [{ name: 'CurrentNode' }] as INodeUi[];
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);

		await executionDebugging.applyExecutionData('1');

		expect(mockWorkflowDocumentStore.pinNodeData).not.toHaveBeenCalled();
		expect(uiStore.markStateDirty).not.toHaveBeenCalled();
	});
});
