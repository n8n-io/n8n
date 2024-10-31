import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExecutionDebugging } from './useExecutionDebugging';
import type { INodeUi, IExecutionResponse } from '@/Interface';
import type { Workflow } from 'n8n-workflow';

describe('useExecutionDebugging()', () => {
	it('should applyExecutionData', async () => {
		setActivePinia(createTestingPinia());
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

		const { applyExecutionData } = useExecutionDebugging();

		await applyExecutionData('1');

		expect(workflowStore.setWorkflowExecutionData).toHaveBeenCalledWith(mockExecution);
	});
});
