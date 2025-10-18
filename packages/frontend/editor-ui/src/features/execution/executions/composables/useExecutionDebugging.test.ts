import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/composables/useWorkflowState';
import { useExecutionDebugging } from './useExecutionDebugging';
import type { INodeUi } from '@/Interface';
import type { IExecutionResponse } from '../executions.types';
import type { Workflow } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';

vi.mock('@/composables/useToast', () => {
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showToast,
		}),
	};
});

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

let workflowState: WorkflowState;
let executionDebugging: ReturnType<typeof useExecutionDebugging>;
let toast: ReturnType<typeof useToast>;

describe('useExecutionDebugging()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
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
		workflowStore.getNodes.mockReturnValue([{ name: 'testNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);
		workflowStore.workflowObject = {
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow;

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
		workflowStore.getNodes.mockReturnValue([{ name: 'TriggerNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);
		workflowStore.workflowObject = {
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow;

		await executionDebugging.applyExecutionData('1');

		expect(workflowStore.pinData).toHaveBeenCalledWith({
			node: { name: 'TriggerNode' },
			data: [
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
			isRestoration: true,
		});
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
		workflowStore.getNodes.mockReturnValue([{ name: 'TriggerNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);
		workflowStore.workflowObject = {
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow;

		await executionDebugging.applyExecutionData('1');

		expect(workflowStore.pinData).toHaveBeenCalledWith({
			node: { name: 'TriggerNode' },
			data: [{ json: { test: 'data' } }],
			isRestoration: true,
		});
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
		workflowStore.getNodes.mockReturnValue([{ name: 'testNode2' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);
		workflowStore.workflowObject = {
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow;
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
		workflowStore.getNodes.mockReturnValue([{ name: 'testNode' }] as INodeUi[]);
		workflowStore.getExecution.mockResolvedValueOnce(mockExecution);
		workflowStore.workflowObject = {
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow;
		const setWorkflowExecutionData = vi.spyOn(workflowState, 'setWorkflowExecutionData');

		await executionDebugging.applyExecutionData('1');

		expect(setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
		expect(toast.showToast).toHaveBeenCalledTimes(1);
	});
});
