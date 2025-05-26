import { setActivePinia } from 'pinia';
import { useLogsExecutionData } from './useLogsExecutionData';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { nodeTypes } from '../__test__/data';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import type { IRunExecutionData } from 'n8n-workflow';
import { stringify } from 'flatted';
import { useToast } from '@/composables/useToast';

vi.mock('@/composables/useToast');

describe(useLogsExecutionData, () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		workflowsStore = mockedStore(useWorkflowsStore);

		nodeTypeStore = mockedStore(useNodeTypesStore);
		nodeTypeStore.setNodeTypes(nodeTypes);
	});

	describe('loadSubExecution', () => {
		beforeEach(() => {
			workflowsStore.setWorkflowExecutionData(
				createTestWorkflowExecutionResponse({
					id: 'e0',
					workflowData: createTestWorkflow({
						id: 'w0',
						nodes: [createTestNode({ name: 'A' }), createTestNode({ name: 'B' })],
						connections: {
							A: {
								main: [[{ type: 'main', node: 'B', index: 0 }]],
							},
						},
					}),
					data: {
						resultData: {
							runData: {
								A: [createTestTaskData()],
								B: [
									createTestTaskData({
										metadata: { subExecution: { workflowId: 'w1', executionId: 'e1' } },
									}),
								],
							},
						},
					},
				}),
			);
		});

		it('should add runs from sub execution to the entries', async () => {
			workflowsStore.fetchExecutionDataById.mockResolvedValueOnce(
				createTestWorkflowExecutionResponse({
					id: 'e1',
					data: stringify({
						resultData: { runData: { C: [createTestTaskData()] } },
					}) as unknown as IRunExecutionData, // Data is stringified in actual API response
					workflowData: createTestWorkflow({ id: 'w1', nodes: [createTestNode({ name: 'C' })] }),
				}),
			);

			const { loadSubExecution, entries } = useLogsExecutionData();

			expect(entries.value).toHaveLength(2);
			expect(entries.value[1].children).toHaveLength(0);

			await loadSubExecution(entries.value[1]);

			await waitFor(() => {
				expect(entries.value).toHaveLength(2);
				expect(entries.value[1].children).toHaveLength(1);
				expect(entries.value[1].children[0].node.name).toBe('C');
				expect(entries.value[1].children[0].workflow.id).toBe('w1');
				expect(entries.value[1].children[0].executionId).toBe('e1');
			});
		});

		it('should show toast when failed to fetch execution data for sub execution', async () => {
			const showErrorSpy = vi.fn();
			const useToastMock = vi.mocked(useToast);

			useToastMock.mockReturnValue({ showError: showErrorSpy } as unknown as ReturnType<
				typeof useToastMock
			>);

			workflowsStore.fetchWorkflow.mockResolvedValueOnce(createTestWorkflow());
			workflowsStore.fetchExecutionDataById.mockRejectedValueOnce(
				new Error('test execution fetch fail'),
			);

			const { loadSubExecution, entries } = useLogsExecutionData();

			await loadSubExecution(entries.value[1]);
			await waitFor(() => expect(showErrorSpy).toHaveBeenCalled());
		});
	});
});
