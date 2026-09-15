import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';

import type { TestCaseExecutionRecord } from '../evaluation.api';
import { useEvaluationStore } from '../evaluation.store';
import type { EvaluationCollectionDetail } from '../evalCollections.types';
import { useCompareCases } from './useCompareCases';

const run = (testRunId: string): EvaluationCollectionDetail['runs'][number] => ({
	testRunId,
	workflowVersionId: testRunId,
	status: 'completed',
	runAt: null,
	completedAt: null,
	avgScore: null,
	metrics: null,
});

const detailWith = (runIds: string[]): EvaluationCollectionDetail => ({
	id: 'col-1',
	name: 'Compare',
	description: null,
	workflowId: 'wf-1',
	evaluationConfigId: 'cfg-1',
	createdById: 'u1',
	createdAt: '',
	updatedAt: '',
	runCount: runIds.length,
	runs: runIds.map(run),
});

const caseRecord = (
	overrides: Partial<TestCaseExecutionRecord> & Pick<TestCaseExecutionRecord, 'id' | 'testRunId'>,
): TestCaseExecutionRecord => ({
	executionId: null,
	status: 'success',
	createdAt: '',
	updatedAt: '',
	runAt: null,
	...overrides,
});

describe('useCompareCases', () => {
	let store: ReturnType<typeof useEvaluationStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
		store = useEvaluationStore();
		store.fetchTestCaseExecutions = vi.fn(
			async () => [],
		) as unknown as typeof store.fetchTestCaseExecutions;
	});

	function seed(records: TestCaseExecutionRecord[]) {
		store.$patch((state) => {
			state.testCaseExecutionsById = Object.fromEntries(records.map((r) => [r.id, r]));
		});
	}

	it('aligns cases across runs by runIndex and picks the best version per case', async () => {
		// helpfulness is a 1–5 AI-judge metric → normalized /5 (3.5 → 0.7 etc.).
		seed([
			caseRecord({ id: 'a0', testRunId: 'run-a', runIndex: 0, metrics: { helpfulness: 3.5 } }),
			caseRecord({ id: 'a1', testRunId: 'run-a', runIndex: 1, metrics: { helpfulness: 2.5 } }),
			// run-b returned out of order — alignment must sort by runIndex.
			caseRecord({ id: 'b1', testRunId: 'run-b', runIndex: 1, metrics: { helpfulness: 4.5 } }),
			caseRecord({ id: 'b0', testRunId: 'run-b', runIndex: 0, metrics: { helpfulness: 3 } }),
		]);
		const { caseRows, mismatch } = useCompareCases(
			ref(detailWith(['run-a', 'run-b'])),
			ref('wf-1'),
		);
		await nextTick();

		expect(mismatch.value.hasMismatch).toBe(false);
		expect(caseRows.value).toHaveLength(2);
		// case #0: A 0.7 vs B 0.6 → A best
		expect(caseRows.value[0].bestVersionIndex).toBe(0);
		expect(caseRows.value[0].cells[1].testCaseId).toBe('b0');
		// case #1: A 0.5 vs B 0.9 → B best
		expect(caseRows.value[1].bestVersionIndex).toBe(1);
		expect(caseRows.value[1].cells.map((c) => c.score)).toEqual([0.5, 0.9]);
	});

	it('flags a dataset mismatch and null-fills missing cells when case counts diverge', async () => {
		// helpfulness is a 1–5 AI-judge metric → normalized /5 (4 → 0.8 etc.).
		seed([
			caseRecord({ id: 'a0', testRunId: 'run-a', runIndex: 0, metrics: { helpfulness: 3.5 } }),
			caseRecord({ id: 'a1', testRunId: 'run-a', runIndex: 1, metrics: { helpfulness: 4 } }),
			caseRecord({ id: 'b0', testRunId: 'run-b', runIndex: 0, metrics: { helpfulness: 3 } }),
		]);
		const { caseRows, mismatch } = useCompareCases(
			ref(detailWith(['run-a', 'run-b'])),
			ref('wf-1'),
		);
		await nextTick();

		expect(mismatch.value.hasMismatch).toBe(true);
		expect(mismatch.value.counts).toEqual([2, 1]);
		// run-b has no case #1 → its cell is null-filled, run-a keeps its value.
		expect(caseRows.value[1].cells[0].score).toBe(0.8);
		expect(caseRows.value[1].cells[1].testCaseId).toBeNull();
		expect(caseRows.value[1].cells[1].score).toBeNull();
	});

	it('does not flag a mismatch when a run failed before seeding cases', async () => {
		seed([
			caseRecord({ id: 'a0', testRunId: 'run-a', runIndex: 0, metrics: { helpfulness: 5 } }),
			caseRecord({ id: 'a1', testRunId: 'run-a', runIndex: 1, metrics: { helpfulness: 4 } }),
		]);
		// run-b errored → zero cases; a failed run must not read as dataset drift.
		const detail = {
			...detailWith(['run-a']),
			runs: [run('run-a'), { ...run('run-b'), status: 'error' as const }],
		};
		const { mismatch } = useCompareCases(ref(detail), ref('wf-1'));
		await nextTick();

		expect(mismatch.value.hasMismatch).toBe(false);
		// only the completed run's count is compared (the failed run's 0 is excluded).
		expect(mismatch.value.counts).toEqual([2]);
	});

	it('fans out fetchTestCaseExecutions once per run and toggles loading', async () => {
		const fetchSpy = vi.fn(async ({ runId }: { workflowId: string; runId: string }) => {
			store.$patch((state) => {
				state.testCaseExecutionsById = {
					...state.testCaseExecutionsById,
					[`${runId}-0`]: caseRecord({ id: `${runId}-0`, testRunId: runId, runIndex: 0 }),
				};
			});
			return [];
		});
		store.fetchTestCaseExecutions = fetchSpy as unknown as typeof store.fetchTestCaseExecutions;

		const { loading, casesLoaded, caseRows, load } = useCompareCases(
			ref(detailWith(['run-a', 'run-b'])),
			ref('wf-1'),
		);
		await load();

		expect(fetchSpy).toHaveBeenCalledWith({ workflowId: 'wf-1', runId: 'run-a' });
		expect(fetchSpy).toHaveBeenCalledWith({ workflowId: 'wf-1', runId: 'run-b' });
		expect(loading.value).toBe(false);
		expect(casesLoaded.value).toBe(true);
		expect(caseRows.value).toHaveLength(1);
	});

	it('silently refetches case rows on each detail refresh while a run is in progress', async () => {
		const fetchSpy = vi.fn(async () => []);
		store.fetchTestCaseExecutions = fetchSpy as unknown as typeof store.fetchTestCaseExecutions;

		const runningDetail = (): EvaluationCollectionDetail => ({
			...detailWith(['run-a']),
			runs: [{ ...run('run-a'), status: 'running' as const }],
		});
		const detail = ref<EvaluationCollectionDetail | null>(runningDetail());
		const { loading, casesLoaded } = useCompareCases(detail, ref('wf-1'));

		const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));
		await flush(); // initial (non-silent) load settles
		expect(casesLoaded.value).toBe(true);
		const callsAfterInitial = fetchSpy.mock.calls.length;

		// A poll tick replaces the detail object while the run is still in progress.
		detail.value = runningDetail();
		await flush();

		// Rows were refetched live, without flipping the table back into loading.
		expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsAfterInitial);
		expect(loading.value).toBe(false);
	});

	it('stops refetching once the runs have settled', async () => {
		const fetchSpy = vi.fn(async () => []);
		store.fetchTestCaseExecutions = fetchSpy as unknown as typeof store.fetchTestCaseExecutions;

		const detail = ref<EvaluationCollectionDetail | null>({
			...detailWith(['run-a']),
			runs: [{ ...run('run-a'), status: 'running' as const }],
		});
		const { casesLoaded } = useCompareCases(detail, ref('wf-1'));

		const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));
		await flush();
		expect(casesLoaded.value).toBe(true);

		// Run settles → one final refetch captures the last cases, then polling stops.
		detail.value = { ...detailWith(['run-a']), runs: [run('run-a')] };
		await flush();
		const callsAtSettle = fetchSpy.mock.calls.length;

		// A later detail change (e.g. re-render) must not keep refetching.
		detail.value = { ...detailWith(['run-a']), runs: [run('run-a')] };
		await flush();
		expect(fetchSpy.mock.calls.length).toBe(callsAtSettle);
	});

	it('polls only in-flight runs, not an already-completed one, on each tick', async () => {
		const fetchSpy = vi.fn(async (_params: { workflowId: string; runId: string }) => []);
		store.fetchTestCaseExecutions = fetchSpy as unknown as typeof store.fetchTestCaseExecutions;

		// run-a completed, run-b still running.
		const mixed = (): EvaluationCollectionDetail => ({
			...detailWith(['run-a', 'run-b']),
			runs: [run('run-a'), { ...run('run-b'), status: 'running' as const }],
		});
		const detail = ref<EvaluationCollectionDetail | null>(mixed());
		const { casesLoaded } = useCompareCases(detail, ref('wf-1'));

		const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));
		await flush(); // initial full load fetches both runs
		expect(casesLoaded.value).toBe(true);

		fetchSpy.mockClear();
		detail.value = mixed(); // a poll tick while run-b is still running
		await flush();

		const fetchedRunIds = fetchSpy.mock.calls.map((c) => c[0].runId);
		// run-a is completed and was already fetched by the initial load → skipped;
		// run-b is still in flight → polled.
		expect(fetchedRunIds).toContain('run-b');
		expect(fetchedRunIds).not.toContain('run-a');
	});

	it('runs the final refetch when a run finishes before the first poll tick', async () => {
		const fetchSpy = vi.fn(async (_params: { workflowId: string; runId: string }) => []);
		store.fetchTestCaseExecutions = fetchSpy as unknown as typeof store.fetchTestCaseExecutions;

		// In-flight at initial load, so the initial (full) load captures a partial snapshot.
		const detail = ref<EvaluationCollectionDetail | null>({
			...detailWith(['run-a']),
			runs: [{ ...run('run-a'), status: 'running' as const }],
		});
		const { casesLoaded } = useCompareCases(detail, ref('wf-1'));

		const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));
		await flush(); // initial load; `wasRunning` is seeded true from the running state
		expect(casesLoaded.value).toBe(true);
		fetchSpy.mockClear();

		// The very first poll tick already sees the run terminal (it finished between
		// the initial load and this tick). The seeded `wasRunning` must still trigger
		// the final refetch — without the seed the watcher would early-return here.
		detail.value = { ...detailWith(['run-a']), runs: [run('run-a')] };
		await flush();

		expect(fetchSpy).toHaveBeenCalledWith({ workflowId: 'wf-1', runId: 'run-a' });
	});

	it('flags casesError when a run fetch rejects (not a real mismatch)', async () => {
		store.fetchTestCaseExecutions = vi.fn(async ({ runId }: { runId: string }) => {
			if (runId === 'run-b') throw new Error('network');
			return [];
		}) as unknown as typeof store.fetchTestCaseExecutions;

		const { casesError, load } = useCompareCases(ref(detailWith(['run-a', 'run-b'])), ref('wf-1'));
		await load();

		expect(casesError.value).toBe(true);
	});

	it('excludes predefined operational metrics from the per-case score', async () => {
		seed([
			caseRecord({
				id: 'a0',
				testRunId: 'run-a',
				runIndex: 0,
				metrics: { helpfulness: 4, totalTokens: 1, executionTime: 0.4 },
			}),
		]);
		const { caseRows } = useCompareCases(ref(detailWith(['run-a'])), ref('wf-1'));
		await nextTick();

		// score is the mean of normalized score metrics → just helpfulness (4/5 = 0.8);
		// tokens/execution time are operational and excluded.
		expect(caseRows.value[0].cells[0].score).toBe(0.8);
	});

	it('aligns by runIndex so a version missing a middle case does not shift later cases', async () => {
		seed([
			caseRecord({ id: 'a0', testRunId: 'run-a', runIndex: 0, metrics: { helpfulness: 5 } }),
			caseRecord({ id: 'a1', testRunId: 'run-a', runIndex: 1, metrics: { helpfulness: 4 } }),
			caseRecord({ id: 'a2', testRunId: 'run-a', runIndex: 2, metrics: { helpfulness: 3 } }),
			// run-b is missing the middle case (runIndex 1).
			caseRecord({ id: 'b0', testRunId: 'run-b', runIndex: 0, metrics: { helpfulness: 5 } }),
			caseRecord({ id: 'b2', testRunId: 'run-b', runIndex: 2, metrics: { helpfulness: 2 } }),
		]);
		const { caseRows } = useCompareCases(ref(detailWith(['run-a', 'run-b'])), ref('wf-1'));
		await nextTick();

		expect(caseRows.value).toHaveLength(3);
		// runIndex 1: run-b has no case → null cell, not run-b's next case shifted up.
		expect(caseRows.value[1].cells[0].testCaseId).toBe('a1');
		expect(caseRows.value[1].cells[1].testCaseId).toBeNull();
		// runIndex 2: b2 stays paired with a2 (same seeded case), not with a1.
		expect(caseRows.value[2].cells[0].testCaseId).toBe('a2');
		expect(caseRows.value[2].cells[1].testCaseId).toBe('b2');
	});

	it('resolves to a loaded (not stuck) state for an empty collection', async () => {
		const { casesLoaded, loading, caseRows } = useCompareCases(ref(detailWith([])), ref('wf-1'));
		await nextTick();

		// The watcher must still invoke load() for a detail with no runs so its
		// empty-run completion branch runs, rather than sitting in loading forever.
		expect(casesLoaded.value).toBe(true);
		expect(loading.value).toBe(false);
		expect(caseRows.value).toEqual([]);
	});
});
