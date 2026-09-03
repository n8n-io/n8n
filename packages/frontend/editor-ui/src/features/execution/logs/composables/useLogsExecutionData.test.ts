import { setActivePinia } from 'pinia';
import { useLogsExecutionData } from './useLogsExecutionData';
import type { NodeLogEntry } from '../logs.types';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { nodeTypes } from '../__test__/data';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { createRunExecutionData, type INode, type IRunExecutionData } from 'n8n-workflow';
import { useToast } from '@n8n/composables/useToast';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { computed } from 'vue';

vi.mock('@n8n/composables/useToast');

describe(useLogsExecutionData, () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let workflowsListStore: ReturnType<typeof mockedStore<typeof useWorkflowsListStore>>;
	let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let executionStateStore: ReturnType<typeof useWorkflowExecutionStateStore>;
	let documentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsListStore = mockedStore(useWorkflowsListStore);

		// The composable resolves the execution-state store via the injected
		// document store (falls back to `workflowsStore.workflowId`, '' here).
		executionStateStore = useWorkflowExecutionStateStore(createWorkflowDocumentId(''));
		documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(''));

		nodeTypeStore = mockedStore(useNodeTypesStore);
		nodeTypeStore.setNodeTypes(nodeTypes);
	});

	describe('isEnabled', () => {
		beforeEach(() => {
			executionStateStore.setWorkflowExecutionData(
				createTestWorkflowExecutionResponse({
					data: createRunExecutionData({ resultData: { runData: { n0: [createTestTaskData()] } } }),
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

	describe('latestNodeNameById', () => {
		/**
		 * The logs panel pairs the execution snapshot against the live canvas by node
		 * id, so an edit that re-ids a surviving node makes it look deleted and strikes
		 * its name through (INS-970, INS-1120).
		 */
		function setUpExecutionWithNodes(nodes: INode[]) {
			executionStateStore.setWorkflowExecutionData(
				createTestWorkflowExecutionResponse({
					data: createRunExecutionData({
						resultData: { runData: { [nodes[0].name]: [createTestTaskData()] } },
					}),
					workflowData: createTestWorkflow({ nodes }),
				}),
			);
		}

		it('should not mark a node as deleted when its id is still on the canvas', async () => {
			const node = createTestNode({ id: 'node-1', name: 'Fetch Orders' });

			setUpExecutionWithNodes([node]);
			documentStore.setNodes([node]);

			const { latestNodeNameById } = useLogsExecutionData();

			await waitAllPromises();
			expect(latestNodeNameById.value['node-1']).toEqual({
				deleted: false,
				disabled: false,
				name: 'Fetch Orders',
			});
		});

		it('should mark a node as deleted when its id is no longer on the canvas', async () => {
			setUpExecutionWithNodes([createTestNode({ id: 'node-1', name: 'Fetch Orders' })]);
			documentStore.setNodes([]);

			const { latestNodeNameById } = useLogsExecutionData();

			await waitAllPromises();
			expect(latestNodeNameById.value['node-1']).toEqual({
				deleted: true,
				disabled: false,
				name: 'Fetch Orders',
			});
		});

		it('should report the new name and not deleted when a node is renamed but keeps its id', async () => {
			setUpExecutionWithNodes([createTestNode({ id: 'node-1', name: 'Fetch Orders' })]);
			documentStore.setNodes([createTestNode({ id: 'node-1', name: 'Fetch Invoices' })]);

			const { latestNodeNameById } = useLogsExecutionData();

			await waitAllPromises();
			expect(latestNodeNameById.value['node-1']).toEqual({
				deleted: false,
				disabled: false,
				name: 'Fetch Invoices',
			});
		});

		it('should mark only the nodes whose ids are gone as deleted', async () => {
			const kept = createTestNode({ id: 'kept', name: 'Kept' });
			const removed = createTestNode({ id: 'removed', name: 'Removed' });

			setUpExecutionWithNodes([kept, removed]);
			documentStore.setNodes([kept]);

			const { latestNodeNameById } = useLogsExecutionData();

			await waitAllPromises();
			expect(latestNodeNameById.value.kept.deleted).toBe(false);
			expect(latestNodeNameById.value.removed.deleted).toBe(true);
		});
	});

	describe('loadSubExecution', () => {
		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });

			executionStateStore.setWorkflowExecutionData(
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
					data: createRunExecutionData({
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
					}),
				}),
			);

			vi.advanceTimersByTime(1000);
		});

		it('should add runs from sub execution to the entries', async () => {
			workflowsStore.fetchExecutionDataById.mockResolvedValueOnce(
				createTestWorkflowExecutionResponse({
					id: 'e1',
					data: {
						resultData: { runData: { C: [createTestTaskData()] } },
					} as unknown as IRunExecutionData,
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
				const childEntry = entries.value[1].children[0] as NodeLogEntry;
				expect(childEntry.node.name).toBe('C');
				expect(childEntry.workflow.id).toBe('w1');
				expect(childEntry.executionId).toBe('e1');
			});
		});

		it('should show toast when failed to fetch execution data for sub execution', async () => {
			const showErrorSpy = vi.fn();
			const useToastMock = vi.mocked(useToast);

			useToastMock.mockReturnValue({ showError: showErrorSpy } as unknown as ReturnType<
				typeof useToastMock
			>);

			workflowsListStore.fetchWorkflow.mockResolvedValueOnce(createTestWorkflow());
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
