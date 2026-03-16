/**
 * Workflows Store Memory Benchmarks
 *
 * Measures memory overhead of ref() vs shallowRef() for execution data.
 * With ref(), Vue creates deep reactive proxies for every nested property,
 * dramatically increasing memory usage for large payloads. shallowRef()
 * avoids this by only tracking the top-level reference.
 *
 * Run: pushd packages/frontend/editor-ui && pnpm vitest bench src/app/stores/__benchmarks__/workflows.store.memory.bench.ts && popd
 */
import { bench, describe } from 'vitest';
import { ref, shallowRef } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { createRunExecutionData } from 'n8n-workflow';
import type { ITaskData } from 'n8n-workflow';
import { useWorkflowsStore } from '../workflows.store';
import { createTestWorkflowExecutionResponse } from '../../../__tests__/mocks';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

// ---------------------------------------------------------------------------
// Payload factory (same as perf bench for consistency)
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
						nested: { a: 1, b: [1, 2, 3], c: { deep: true, level2: { x: j } } },
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

// Pre-build payloads
const SMALL = createPayload(10, 100);
const MEDIUM = createPayload(50, 1_000);
const LARGE = createPayload(100, 5_000);

// ---------------------------------------------------------------------------
// 1. Raw Vue: ref vs shallowRef memory overhead
// ---------------------------------------------------------------------------

describe('Memory: ref() vs shallowRef() heap overhead', () => {
	bench('ref — small (10 nodes × 100 rows)', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = structuredClone(SMALL);
	});

	bench('shallowRef — small (10 nodes × 100 rows)', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = structuredClone(SMALL);
	});

	bench('ref — medium (50 nodes × 1K rows)', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = structuredClone(MEDIUM);
	});

	bench('shallowRef — medium (50 nodes × 1K rows)', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = structuredClone(MEDIUM);
	});

	bench('ref — large (100 nodes × 5K rows)', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = structuredClone(LARGE);
	});

	bench('shallowRef — large (100 nodes × 5K rows)', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = structuredClone(LARGE);
	});
});

// ---------------------------------------------------------------------------
// 2. Store-level memory: full assignment + computed derivation
// ---------------------------------------------------------------------------

describe('Memory: store assignment + access pattern', () => {
	bench('assign + read runData keys — medium', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = structuredClone(MEDIUM);

		// Simulate common access pattern: reading run data keys
		const data = store.workflowExecutionData;
		if (data?.data?.resultData?.runData) {
			Object.keys(data.data.resultData.runData);
		}
	});

	bench('assign + read runData keys — large', () => {
		setActivePinia(createPinia());
		const store = useWorkflowsStore();
		store.workflowExecutionData = structuredClone(LARGE);

		const data = store.workflowExecutionData;
		if (data?.data?.resultData?.runData) {
			Object.keys(data.data.resultData.runData);
		}
	});
});

// ---------------------------------------------------------------------------
// 3. Repeated assignment churn (simulates execution history browsing)
// ---------------------------------------------------------------------------

describe('Memory: repeated assignment churn (GC pressure)', () => {
	const payloads = Array.from({ length: 5 }, (_, i) => createPayload(20, 500 + i * 100));

	bench('cycle through 5 payloads with ref()', () => {
		const r = ref<IExecutionResponse | null>(null);
		for (const p of payloads) {
			r.value = p;
		}
		r.value = null;
	});

	bench('cycle through 5 payloads with shallowRef()', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		for (const p of payloads) {
			r.value = p;
		}
		r.value = null;
	});
});

// ---------------------------------------------------------------------------
// 4. Nested property access cost (proxy traversal vs direct)
// ---------------------------------------------------------------------------

describe('Memory: deep property access overhead', () => {
	bench('ref — deep access 1000x on large payload', () => {
		const r = ref<IExecutionResponse | null>(null);
		r.value = LARGE;
		const data = r.value;
		for (let i = 0; i < 1000; i++) {
			// Access deeply nested data — ref() creates proxies on access
			const node = data?.data?.resultData?.runData?.['Node_50'];
			if (node?.[0]?.data?.main?.[0]?.[0]?.json) {
				// force proxy creation
				void node[0].data.main[0][0].json.id;
			}
		}
	});

	bench('shallowRef — deep access 1000x on large payload', () => {
		const r = shallowRef<IExecutionResponse | null>(null);
		r.value = LARGE;
		const data = r.value;
		for (let i = 0; i < 1000; i++) {
			// Same access — shallowRef() returns plain objects (no proxy)
			const node = data?.data?.resultData?.runData?.['Node_50'];
			if (node?.[0]?.data?.main?.[0]?.[0]?.json) {
				void node[0].data.main[0][0].json.id;
			}
		}
	});
});
