/**
 * Workflows Store Benchmarks — shallowRef vs ref performance
 *
 * Measures the cost of assigning and updating `workflowExecutionData` in the
 * workflows store. The key optimization is converting from `ref()` (deep proxy)
 * to `shallowRef()` (top-level-only tracking), which eliminates Vue's deep
 * reactivity overhead on large execution payloads.
 *
 * Run: pushd packages/frontend/editor-ui && pnpm vitest bench src/app/stores/__benchmarks__/workflows.store.bench.ts && popd
 */
import { bench, describe } from 'vitest';
import { ref, shallowRef } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { createRunExecutionData } from 'n8n-workflow';
import type { ITaskData } from 'n8n-workflow';

import { createTestWorkflowExecutionResponse } from '../../../__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useWorkflowsStore } from '../workflows.store';

// ---------------------------------------------------------------------------
// Payload factory
// ---------------------------------------------------------------------------

function createTaskData(rowCount: number): ITaskData {
	return {
		startTime: Date.now(),
		executionTime: 100,
		executionIndex: 0,
		source: [],
		executionStatus: 'success',
		data: {
			main: [
				Array.from({ length: rowCount }, (_, j) => ({
					json: {
						id: j,
						name: `item_${j}`,
						nested: { a: 1, b: [1, 2, 3], c: { deep: true } },
					},
				})),
			],
		},
	};
}

function createPayload(nodeCount: number, rowsPerNode: number): IExecutionResponse {
	const runData: Record<string, ITaskData[]> = {};
	for (let i = 0; i < nodeCount; i++) {
		runData[`Node_${i}`] = [createTaskData(rowsPerNode)];
	}

	return createTestWorkflowExecutionResponse({
		data: createRunExecutionData({
			resultData: { runData, lastNodeExecuted: `Node_${nodeCount - 1}` },
		}),
	});
}

// Pre-build payloads once — construction cost is excluded from benchmarks
const SMALL = createPayload(10, 100); // ~1K items
const MEDIUM = createPayload(50, 1_000); // ~50K items
const LARGE = createPayload(100, 5_000); // ~500K items

// ---------------------------------------------------------------------------
// 1. Raw Vue primitive comparison: ref vs shallowRef assignment
// ---------------------------------------------------------------------------

describe('Raw Vue: ref() vs shallowRef() assignment cost', () => {
	bench('ref — small (10 nodes × 100 rows)', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = SMALL;
	});

	bench('shallowRef — small (10 nodes × 100 rows)', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = SMALL;
	});

	bench('ref — medium (50 nodes × 1K rows)', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = MEDIUM;
	});

	bench('shallowRef — medium (50 nodes × 1K rows)', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = MEDIUM;
	});

	bench('ref — large (100 nodes × 5K rows)', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = LARGE;
	});

	bench('shallowRef — large (100 nodes × 5K rows)', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = LARGE;
	});
});

// ---------------------------------------------------------------------------
// 2. Store-level: full setWorkflowExecutionData assignment
// ---------------------------------------------------------------------------

describe('Store: workflowExecutionData assignment', () => {
	bench('small payload (10 nodes, 100 rows/node)', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = SMALL;
	});

	bench('medium payload (50 nodes, 1K rows/node)', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = MEDIUM;
	});

	bench('large payload (100 nodes, 5K rows/node)', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = LARGE;
	});
});

// ---------------------------------------------------------------------------
// 3. Store-level: updateExecutionResultData (immutable nested update)
// ---------------------------------------------------------------------------

describe('Store: updateExecutionResultData (nested update)', () => {
	bench('update lastNodeExecuted on small payload', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = SMALL;
		store.updateExecutionResultData(() => ({ lastNodeExecuted: 'Node_0' }));
	});

	bench('update lastNodeExecuted on large payload', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = LARGE;
		store.updateExecutionResultData(() => ({ lastNodeExecuted: 'Node_99' }));
	});

	bench('update runData on large payload', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = LARGE;
		store.updateExecutionResultData((resultData) => ({
			runData: {
				...resultData.runData,
				Node_50: [createTaskData(100)],
			},
		}));
	});
});

// ---------------------------------------------------------------------------
// 4. Simulated execution streaming: repeated incremental updates
// ---------------------------------------------------------------------------

describe('Store: simulated execution streaming (10 node updates)', () => {
	bench('10 incremental updateExecutionResultData calls', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = createPayload(50, 500);

		for (let i = 0; i < 10; i++) {
			store.updateExecutionResultData((resultData) => ({
				runData: {
					...resultData.runData,
					[`StreamNode_${i}`]: [createTaskData(100)],
				},
				lastNodeExecuted: `StreamNode_${i}`,
			}));
		}
	});
});
