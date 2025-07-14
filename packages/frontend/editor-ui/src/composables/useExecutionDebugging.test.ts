import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionDebugging } from './useExecutionDebugging';
import type { INodeUi, IExecutionResponse } from '@/Interface';
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

let executionDebugging: ReturnType<typeof useExecutionDebugging>;
let toast: ReturnType<typeof useToast>;

describe('useExecutionDebugging()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		executionDebugging = useExecutionDebugging();
		toast = useToast();
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
		workflowStore.getCurrentWorkflow.mockReturnValue({
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow);

		await expect(executionDebugging.applyExecutionData('1')).resolves.not.toThrowError();
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
		workflowStore.getCurrentWorkflow.mockReturnValue({
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow);

		await executionDebugging.applyExecutionData('1');

		expect(workflowStore.setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
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
		workflowStore.getCurrentWorkflow.mockReturnValue({
			pinData: {},
			getParentNodes: vi.fn().mockReturnValue([]),
		} as unknown as Workflow);

		await executionDebugging.applyExecutionData('1');

		expect(workflowStore.setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
		expect(toast.showToast).toHaveBeenCalledTimes(1);
	});
});
