/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, getActivePinia, setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import WorkflowExecutionLogViewer from '../components/WorkflowExecutionLogViewer.vue';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { getNDVStoreId } from '@/features/ndv/shared/ndv.store';
import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';

const fetchExecution = vi.fn();
const loadNodeTypesIfNotLoaded = vi.fn();
const CHILD_WORKFLOW_ID = 'child-wf';
const CHILD_EXECUTION_ID = 'exec-1';

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution }),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'child-wf',
		workflowExecutionData: null,
		getNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		getNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

vi.mock('@/app/composables/useWorkflowNormalization', () => ({
	useWorkflowNormalization: () => ({
		normalizeWorkflowData: ({ nodes, connections }: { nodes: unknown[]; connections: object }) => ({
			nodes,
			connections,
		}),
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => null,
		getAllNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
		loadNodeTypesIfNotLoaded,
	}),
}));

vi.mock('@/features/execution/logs/components/LogsOverviewRow.vue', () => ({
	default: {
		props: ['data', 'isSelected'],
		emits: ['toggleSelected', 'toggleExpanded'],
		template:
			'<div data-test-id="log-node-row" @click="$emit(\'toggleSelected\')">{{ data?.node?.name }}</div>',
	},
}));

// Keep RunData lightweight while exercising the strict NDV injection used in production.
vi.mock('@/features/ndv/runData/components/RunData.vue', async () => {
	const [{ computed, defineComponent }, { injectNDVStore }, { injectWorkflowExecutionStateStore }] =
		await Promise.all([
			import('vue'),
			import('@/features/ndv/shared/ndv.store'),
			import('@/app/stores/workflowExecutionState.store'),
		]);

	return {
		default: defineComponent({
			props: ['paneType'],
			setup() {
				const ndvStore = injectNDVStore();
				const executionStateStore = injectWorkflowExecutionStateStore();
				const outputStatus = computed(
					() =>
						executionStateStore.value.activeExecution?.data?.resultData.runData['HTTP Request']?.[0]
							?.data?.main?.[0]?.[0]?.json.status,
				);
				return {
					ndvStoreId: computed(() => ndvStore.value.$id),
					outputStatus,
				};
			},
			template:
				'<div data-test-id="run-data" :data-pane-type="paneType" :data-ndv-store-id="ndvStoreId" :data-output-status="outputStatus" />',
		}),
	};
});

vi.mock('@/features/ndv/runData/components/error/NodeErrorView.vue', () => ({
	default: {
		props: ['error', 'compact', 'showDetails'],
		template: '<div data-test-id="node-error-view" />',
	},
}));

function makeRouter(): Router {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/workflow/:workflowId/executions/:executionId',
				name: 'ExecutionPreview',
				component: { template: '<div/>' },
			},
		],
	});
}

function mountIt(props: { workflowId: string; workflowExecutionId: string }) {
	return mount(WorkflowExecutionLogViewer, {
		props,
		global: {
			plugins: [makeRouter()],
			provide: {
				[WorkflowDocumentStoreKey as symbol]: shallowRef(null),
			},
		},
	});
}

function makeChildExecution(outputStatus = 200) {
	const trigger = createTestNode({
		id: 'trigger',
		name: 'When Executed by Another Workflow',
		type: 'n8n-nodes-base.executeWorkflowTrigger',
	});
	const action = createTestNode({ id: 'http', name: 'HTTP Request' });

	return createTestWorkflowExecutionResponse({
		id: CHILD_EXECUTION_ID,
		status: 'success',
		workflowData: createTestWorkflow({
			id: CHILD_WORKFLOW_ID,
			nodes: [trigger, action],
			connections: {
				[trigger.name]: {
					main: [[{ node: action.name, type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		}),
		data: createRunExecutionData({
			resultData: {
				runData: {
					[trigger.name]: [
						createTestTaskData({ data: { main: [[{ json: { query: 'emperor' } }]] } }),
					],
					[action.name]: [
						createTestTaskData({
							source: [
								{
									previousNode: trigger.name,
									previousNodeOutput: 0,
									previousNodeRun: 0,
								},
							],
							data: { main: [[{ json: { status: outputStatus } }]] },
						}),
					],
				},
			},
		}),
	});
}

beforeEach(() => {
	setActivePinia(createPinia());
	fetchExecution.mockReset();
	loadNodeTypesIfNotLoaded.mockReset();
	loadNodeTypesIfNotLoaded.mockResolvedValue(undefined);
});

describe('WorkflowExecutionLogViewer', () => {
	it('shows "Still running" banner when status is running', async () => {
		fetchExecution.mockResolvedValueOnce({
			...makeChildExecution(),
			finished: false,
			status: 'running',
		});
		const w = mountIt({
			workflowId: CHILD_WORKFLOW_ID,
			workflowExecutionId: CHILD_EXECUTION_ID,
		});
		await flushPromises();
		expect(w.text()).toContain('Still running');
	});

	it('shows "Waiting" banner when status is waiting', async () => {
		fetchExecution.mockResolvedValueOnce({
			...makeChildExecution(),
			finished: false,
			status: 'waiting',
		});
		const w = mountIt({
			workflowId: CHILD_WORKFLOW_ID,
			workflowExecutionId: CHILD_EXECUTION_ID,
		});
		await flushPromises();
		expect(w.text()).toContain('Waiting');
	});

	it('shows error banner when fetchExecution rejects', async () => {
		fetchExecution.mockRejectedValueOnce(new Error('not found'));
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'bad' });
		await flushPromises();
		expect(w.text()).toContain('unavailable');
	});

	it('shows error banner when fetchExecution returns undefined', async () => {
		fetchExecution.mockResolvedValueOnce(undefined);
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'bad' });
		await flushPromises();
		expect(w.text()).toContain('unavailable');
	});

	it('shows error banner when the RunData scope cannot be prepared', async () => {
		loadNodeTypesIfNotLoaded.mockRejectedValueOnce(new Error('node types unavailable'));
		fetchExecution.mockResolvedValueOnce(makeChildExecution());
		const w = mountIt({
			workflowId: CHILD_WORKFLOW_ID,
			workflowExecutionId: CHILD_EXECUTION_ID,
		});

		await flushPromises();

		expect(w.text()).toContain('unavailable');
	});

	it('calls fetchExecution with the executionId on mount', async () => {
		fetchExecution.mockResolvedValueOnce(makeChildExecution());
		mountIt({
			workflowId: CHILD_WORKFLOW_ID,
			workflowExecutionId: CHILD_EXECUTION_ID,
		});
		await flushPromises();
		expect(fetchExecution).toHaveBeenCalledWith(CHILD_EXECUTION_ID);
	});

	it('provides input and output panes with isolated execution data', async () => {
		fetchExecution.mockResolvedValueOnce(makeChildExecution());

		const wrapper = mountIt({
			workflowId: CHILD_WORKFLOW_ID,
			workflowExecutionId: CHILD_EXECUTION_ID,
		});
		await flushPromises();

		const rows = wrapper.findAll('[data-test-id="log-node-row"]');
		expect(rows).toHaveLength(2);
		await rows[1].trigger('click');

		const panes = wrapper.findAll('[data-test-id="run-data"]');
		expect(panes.map((pane) => pane.attributes('data-pane-type'))).toEqual(['input', 'output']);
		const ndvStoreIds = panes.map((pane) => pane.attributes('data-ndv-store-id'));
		expect(ndvStoreIds[0]).toBe(ndvStoreIds[1]);
		expect(ndvStoreIds[0]).not.toBe(getNDVStoreId(createWorkflowDocumentId(CHILD_WORKFLOW_ID)));
		expect(panes.map((pane) => pane.attributes('data-output-status'))).toEqual(['200', '200']);
	});

	it('does not replace execution data in the editor workflow scope', async () => {
		const editorDocumentId = createWorkflowDocumentId(CHILD_WORKFLOW_ID);
		const editorExecution = makeChildExecution(102);
		useWorkflowExecutionStateStore(editorDocumentId).setWorkflowExecutionData(editorExecution);
		fetchExecution.mockResolvedValueOnce(makeChildExecution());

		mountIt({ workflowId: CHILD_WORKFLOW_ID, workflowExecutionId: CHILD_EXECUTION_ID });
		await flushPromises();

		const storedEditorExecution = useWorkflowExecutionStateStore(editorDocumentId).activeExecution;
		expect(storedEditorExecution?.id).toBe(CHILD_EXECUTION_ID);
		expect(
			storedEditorExecution?.data?.resultData.runData['HTTP Request']?.[0]?.data?.main?.[0]?.[0]
				?.json,
		).toEqual({ status: 102 });
	});

	it('does not install scoped stores when unmounted before the fetch resolves', async () => {
		let resolveExecution: (execution: ReturnType<typeof makeChildExecution>) => void = () => {};
		fetchExecution.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveExecution = resolve;
			}),
		);
		const wrapper = mountIt({
			workflowId: CHILD_WORKFLOW_ID,
			workflowExecutionId: CHILD_EXECUTION_ID,
		});
		await flushPromises();
		expect(fetchExecution).toHaveBeenCalledWith(CHILD_EXECUTION_ID);

		wrapper.unmount();
		resolveExecution(makeChildExecution());
		await flushPromises();

		const standaloneStoreIds = Object.keys(getActivePinia()?.state.value ?? {}).filter((storeId) =>
			storeId.includes('standalone-run-data'),
		);
		expect(standaloneStoreIds).toEqual([]);
	});
});
