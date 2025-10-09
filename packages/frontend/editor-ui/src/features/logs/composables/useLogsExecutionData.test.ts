import { setActivePinia } from 'pinia';
import { useLogsExecutionData } from './useLogsExecutionData';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
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
import {
	injectWorkflowState,
	useWorkflowState,
	type WorkflowState,
} from '@/composables/useWorkflowState';
import { computed } from 'vue';

vi.mock('@/composables/useToast');

vi.mock('@/composables/useWorkflowState', async () => {
	const actual = await vi.importActual('@/composables/useWorkflowState');
	return {
		...actual,
		injectWorkflowState: vi.fn(),
	};
});

let workflowState: WorkflowState;

describe(useLogsExecutionData, () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		workflowsStore = mockedStore(useWorkflowsStore);

		workflowState = useWorkflowState();
		vi.mocked(injectWorkflowState).mockReturnValue(workflowState);

		nodeTypeStore = mockedStore(useNodeTypesStore);
		nodeTypeStore.setNodeTypes(nodeTypes);
	});

	describe('isEnabled', () => {
		beforeEach(() => {
			workflowState.setWorkflowExecutionData(
				createTestWorkflowExecutionResponse({
					data: { resultData: { runData: { n0: [createTestTaskData()] } } },
					workflowData: createTestWorkflow({ nodes: [createTestNode({ name: 'n0' })] }),
				}),
			);
		});

		it('should not calculate entries isEnabled is false', async () => {
			const { entries } = useLogsExecutionData({ isEnabled: computed(() => false) });

			await waitAllPromises();
			expect(entries.value).toHaveLength(0);
		});

		it('should calculate entries if isEnabled is true', async () => {
			const { entries } = useLogsExecutionData({ isEnabled: computed(() => true) });

			await waitAllPromises();
			expect(entries.value).toHaveLength(1);
		});
	});

	describe('loadSubExecution', () => {
		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });

			workflowState.setWorkflowExecutionData(
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

			vi.advanceTimersByTime(1000);
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

			await waitFor(() => expect(entries.value).toHaveLength(2));
			expect(entries.value[1].children).toHaveLength(0);

			await loadSubExecution(entries.value[1]);

			vi.advanceTimersByTime(1000);

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

			await waitFor(() => expect(entries.value).toHaveLength(2));
			await loadSubExecution(entries.value[1]);

			vi.advanceTimersByTime(1000);

			await waitFor(() => expect(showErrorSpy).toHaveBeenCalled());
		});
	});
});
