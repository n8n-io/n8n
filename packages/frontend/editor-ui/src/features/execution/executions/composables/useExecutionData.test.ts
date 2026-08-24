import { computed, type WritableComputedRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { INode, IRunData, ITaskData } from 'n8n-workflow';
import { useExecutionData } from './useExecutionData';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {} }),
	RouterLink: vi.fn(),
}));

const executedNode = createTestNode({ id: 'executed-node', name: 'Message a model' });
const successfulTask = { executionStatus: 'success' } as ITaskData;

describe('useExecutionData()', () => {
	// With nothing provided the composable falls back to the workflows store's
	// (empty) workflow id, so seed the execution-state store keyed by that id.
	// Testing pinia makes getters writable; the cast makes that visible to TS.
	function seedExecution({
		snapshotNodes,
		runData,
	}: {
		snapshotNodes: INode[] | undefined;
		runData: IRunData;
	}) {
		const store = mockedStore(
			useWorkflowExecutionStateStore,
			createWorkflowDocumentId(''),
		) as unknown as {
			activeExecution: Partial<IExecutionResponse> | null;
			activeExecutionRunData: IRunData;
			activeExecutionRunDataByNodeId: Map<string, WritableComputedRef<ITaskData[] | null>>;
		};

		store.activeExecution = {
			...(snapshotNodes ? { workflowData: createTestWorkflow({ nodes: snapshotNodes }) } : {}),
		};

		store.activeExecutionRunData = runData;

		store.activeExecutionRunDataByNodeId = new Map(
			(snapshotNodes ?? []).map((node) => [
				node.id,
				computed({
					get: () => runData[node.name] ?? null,
					set: () => {},
				}),
			]),
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
	});

	it('returns the run data of the node that the execution ran', () => {
		seedExecution({
			snapshotNodes: [executedNode],
			runData: { 'Message a model': [successfulTask] },
		});

		const { nodeRunData, hasNodeRun } = useExecutionData({
			node: computed(() => executedNode),
		});

		expect(nodeRunData.value).toEqual([successfulTask]);
		expect(hasNodeRun.value).toBe(true);
	});

	it('returns nothing for a node that reuses the name of a node the execution ran', () => {
		seedExecution({
			snapshotNodes: [executedNode],
			runData: { 'Message a model': [successfulTask] },
		});

		// Same name, different node: added after the run, so the execution's node
		// snapshot does not know its id.
		const replacementNode = createTestNode({ id: 'added-later', name: 'Message a model' });

		const { nodeRunData, hasNodeRun } = useExecutionData({
			node: computed(() => replacementNode),
		});

		expect(nodeRunData.value).toBeNull();
		expect(hasNodeRun.value).toBe(false);
	});

	it('falls back to the node name when the execution recorded no nodes', () => {
		seedExecution({
			snapshotNodes: undefined,
			runData: { 'Message a model': [successfulTask] },
		});

		const { nodeRunData, hasNodeRun } = useExecutionData({
			node: computed(() => createTestNode({ id: 'any-id', name: 'Message a model' })),
		});

		expect(nodeRunData.value).toEqual([successfulTask]);
		expect(hasNodeRun.value).toBe(true);
	});

	it('returns nothing when there is no node', () => {
		seedExecution({
			snapshotNodes: [executedNode],
			runData: { 'Message a model': [successfulTask] },
		});

		const { nodeRunData, hasNodeRun } = useExecutionData({ node: computed(() => undefined) });

		expect(nodeRunData.value).toBeNull();
		expect(hasNodeRun.value).toBe(false);
	});
});
