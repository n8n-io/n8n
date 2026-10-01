import { computed } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INode, IRunData, ITaskData } from 'n8n-workflow';
import { useExecutionData } from './useExecutionData';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {} }),
	RouterLink: vi.fn(),
}));

const successfulTask = { executionStatus: 'success' } as ITaskData;

describe('useExecutionData()', () => {
	// The composable falls back to the workflows store's (empty) workflow id when
	// nothing is provided, so seed both stores keyed by that id and let the real
	// `activeExecutionRunData` filter run.
	function seedExecution({
		executedNodes,
		documentNodes,
		runData,
	}: {
		executedNodes: INode[];
		documentNodes: INode[];
		runData: IRunData;
	}) {
		const documentId = createWorkflowDocumentId(useWorkflowsStore().workflowId);

		useWorkflowDocumentStore(documentId).setNodes(documentNodes);
		useWorkflowExecutionStateStore(documentId).setWorkflowExecutionData(
			createTestWorkflowExecutionResponse({
				workflowData: createTestWorkflow({ nodes: executedNodes }),
				data: { resultData: { runData } } as never,
			}),
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
	});

	it('returns the run data of the node that the execution ran', () => {
		const node = createTestNode({ id: 'executed-node', name: 'Message a model' });
		seedExecution({
			executedNodes: [node],
			documentNodes: [node],
			runData: { 'Message a model': [successfulTask] },
		});

		const { nodeRunData, hasNodeRun } = useExecutionData({ node: computed(() => node) });

		expect(nodeRunData.value).toEqual([successfulTask]);
		expect(hasNodeRun.value).toBe(true);
	});

	it('returns nothing for a node that reuses the name of a node the execution ran', () => {
		const executed = createTestNode({ id: 'executed-node', name: 'Message a model' });
		// Same name, different node: added after the run.
		const replacement = createTestNode({ id: 'added-later', name: 'Message a model' });
		seedExecution({
			executedNodes: [executed],
			documentNodes: [replacement],
			runData: { 'Message a model': [successfulTask] },
		});

		const { nodeRunData, hasNodeRun } = useExecutionData({ node: computed(() => replacement) });

		expect(nodeRunData.value).toBeNull();
		expect(hasNodeRun.value).toBe(false);
	});

	it('returns nothing when there is no node', () => {
		const node = createTestNode({ id: 'executed-node', name: 'Message a model' });
		seedExecution({
			executedNodes: [node],
			documentNodes: [node],
			runData: { 'Message a model': [successfulTask] },
		});

		const { nodeRunData, hasNodeRun } = useExecutionData({ node: computed(() => undefined) });

		expect(nodeRunData.value).toBeNull();
		expect(hasNodeRun.value).toBe(false);
	});
});
