import orderBy from 'lodash/orderBy';
import type { JsonObject } from 'n8n-workflow';
import { computed, ref, watch, type Ref } from 'vue';

import type { TestCaseExecutionRecord } from '../evaluation.api';
import { useEvaluationStore } from '../evaluation.store';
import type { EvalCollectionRunStatus, EvaluationCollectionDetail } from '../evalCollections.types';
import { averageNormalizedScore, indexOfMax, stringifyValue } from '../evaluation.utils';

// One version's execution of a single aligned test case. `null`-valued fields
// mark a case that this version's run didn't cover (dataset drift).
export interface CompareCaseCell {
	versionIndex: number;
	testCaseId: string | null;
	// Execution that produced this output, so the Outputs tab can open it. Null when skipped.
	executionId: string | null;
	inputs: JsonObject | undefined;
	outputs: JsonObject | undefined;
	metrics: Record<string, number> | undefined;
	// Mean of the case's score-shaped ([0, 1], non-predefined) metrics, or null
	// when the version skipped this case or reported no score-shaped metric.
	score: number | null;
}

export interface CompareCaseRow {
	index: number;
	displayIndex: number;
	inputPreview: string;
	cells: CompareCaseCell[];
	// Version index with the highest case score, or null if none scored.
	bestVersionIndex: number | null;
}

export interface DatasetMismatch {
	hasMismatch: boolean;
	// Case count per version, aligned to run order.
	counts: number[];
	maxCount: number;
}

// Compact one-line preview of a case's inputs for the table's first column.
function inputPreview(inputs: JsonObject | undefined): string {
	if (!inputs) return '';
	return Object.values(inputs)
		.map((value) => stringifyValue(value))
		.filter((text) => text.length > 0)
		.join(' · ');
}

/**
 * Loads per-case executions for every run and aligns them into one row per test
 * case. Cells align by `runIndex` (the seeded per-case sequence), not list
 * position, so a version missing a case leaves a null cell instead of shifting
 * later cases into the wrong row; divergent counts surface as a `mismatch`.
 */
export function useCompareCases(
	detail: Ref<EvaluationCollectionDetail | null>,
	workflowId: Ref<string>,
) {
	const evaluationStore = useEvaluationStore();

	const loading = ref(false);
	// True once the current run set's fetches have completed at least once. Gates
	// use this rather than `!loading` to avoid acting on the pre-load empty window.
	const casesLoaded = ref(false);
	// True when any run's fetch failed — distinguishes a transient failure from a
	// real mismatch, since a failed run also returns zero cases.
	const casesError = ref(false);

	// Monotonic token so a slow load for a previous collection can't flip state
	// out from under the collection the user has since switched to.
	let loadToken = 0;

	// `silent` refetches (live polling) keep the current rows on screen and don't
	// touch `loading`/`casesLoaded`/`casesError`, so the table neither flashes its
	// loading state nor blinks a transient error banner every few seconds. Rows and
	// scores update reactively as the store data changes. `runs` narrows which runs
	// to fetch (the poll skips already-settled runs); it defaults to the full set.
	async function load({
		silent = false,
		runs,
	}: { silent?: boolean; runs?: EvaluationCollectionDetail['runs'] } = {}) {
		const allRuns = detail.value?.runs ?? [];
		const runsToFetch = runs ?? allRuns;
		const token = ++loadToken;
		if (allRuns.length === 0) {
			if (!silent) {
				loading.value = false;
				casesError.value = false;
				casesLoaded.value = true;
			}
			return;
		}
		if (!silent) {
			loading.value = true;
			casesLoaded.value = false;
			casesError.value = false;
		}
		if (runsToFetch.length === 0) return; // silent tick with nothing left to refetch
		try {
			const results = await Promise.allSettled(
				runsToFetch.map(
					async (run) =>
						await evaluationStore.fetchTestCaseExecutions({
							workflowId: workflowId.value,
							runId: run.testRunId,
						}),
				),
			);
			// A newer load for a different run set has taken over — don't clobber it.
			if (token !== loadToken) return;
			// Only a full (non-silent) load owns the error banner; a silent poll leaves
			// the last-known state untouched so a transient failure doesn't blink it.
			if (!silent) casesError.value = results.some((result) => result.status === 'rejected');
			casesLoaded.value = true;
		} finally {
			if (token === loadToken && !silent) loading.value = false;
		}
	}

	// Per-run, sorted case lists: bucket the shared store map by `testRunId` in one
	// pass, then sort each bucket by [runIndex, runAt] so aligned positions map to
	// the same seeded case.
	const casesByVersion = computed<TestCaseExecutionRecord[][]>(() => {
		const runs = detail.value?.runs ?? [];
		const byRunId = new Map<string, TestCaseExecutionRecord[]>(
			runs.map((run) => [run.testRunId, []]),
		);
		for (const record of Object.values(evaluationStore.testCaseExecutionsById)) {
			const bucket = record.testRunId ? byRunId.get(record.testRunId) : undefined;
			if (bucket) bucket.push(record);
		}
		return runs.map((run) =>
			orderBy(
				byRunId.get(run.testRunId) ?? [],
				[(record) => record.runIndex ?? Number.MAX_SAFE_INTEGER, (record) => record.runAt ?? ''],
				['asc', 'asc'],
			),
		);
	});

	const mismatch = computed<DatasetMismatch>(() => {
		const runs = detail.value?.runs ?? [];
		// Only compare counts across runs that completed. A run that errored (or
		// hasn't finished) seeds no cases — that's a failed run, not dataset drift,
		// and must not read as a mismatch (e.g. a spurious "12, 0" banner).
		const counts = casesByVersion.value
			.filter((_cases, index) => runs[index]?.status === 'completed')
			.map((cases) => cases.length);
		const maxCount = counts.length ? Math.max(...counts) : 0;
		return {
			counts,
			maxCount,
			hasMismatch: counts.some((count) => count !== maxCount),
		};
	});

	const caseRows = computed<CompareCaseRow[]>(() => {
		// Align cells by `runIndex`, not list position: a version missing a case must
		// leave a null cell rather than shift later cases and pair unrelated inputs.
		// Fall back to list position only when a record has no runIndex.
		const byIndex = casesByVersion.value.map((cases) => {
			const map = new Map<number, TestCaseExecutionRecord>();
			cases.forEach((record, position) => map.set(record.runIndex ?? position, record));
			return map;
		});

		const allIndices = [...new Set(byIndex.flatMap((map) => [...map.keys()]))].sort(
			(a, b) => a - b,
		);

		return allIndices.map((runIndex, rowIndex) => {
			const cells: CompareCaseCell[] = byIndex.map((map, versionIndex) => {
				const record = map.get(runIndex);
				return {
					versionIndex,
					testCaseId: record?.id ?? null,
					executionId: record?.executionId ?? null,
					inputs: record?.inputs,
					outputs: record?.outputs,
					metrics: record?.metrics,
					// Normalize on this version's own run scales (its frozen snapshot),
					// falling back to the collection-wide default.
					score: averageNormalizedScore(
						record?.metrics,
						detail.value?.runs[versionIndex]?.metricScales ?? detail.value?.metricScales,
					),
				};
			});

			const firstWithInputs = cells.find((cell) => cell.inputs !== undefined);
			return {
				index: rowIndex,
				displayIndex: rowIndex + 1,
				inputPreview: inputPreview(firstWithInputs?.inputs),
				cells,
				bestVersionIndex: indexOfMax(cells.map((cell) => cell.score)),
			};
		});
	});

	const isInFlight = (status: EvalCollectionRunStatus) => status === 'new' || status === 'running';

	// Poll state, reset per run set below. `wasRunning` edge-triggers the final
	// settle refetch; `terminalFetched` records runs already fetched once after
	// reaching a terminal state so the poll doesn't re-fetch their immutable rows.
	let wasRunning = false;
	const terminalFetched = new Set<string>();

	// Refetch whenever the run set changes. Key is `null` before detail loads and
	// `''` once loaded with no runs — distinguished so an empty collection still
	// runs `load()` instead of sitting in the loading state forever.
	watch(
		() => (detail.value ? (detail.value.runs ?? []).map((run) => run.testRunId).join(',') : null),
		async (key) => {
			if (key === null) return;
			terminalFetched.clear();
			await load();
			// The full load above already fetched every run, so runs that are already
			// terminal need no further poll fetch — seed them so the poll skips them.
			for (const run of detail.value?.runs ?? []) {
				if (!isInFlight(run.status)) terminalFetched.add(run.testRunId);
			}
			// Seed `wasRunning` from the loaded state (not `false`): if the collection is
			// running now, a later tick that observes it terminal must still fire the
			// final refetch — even if the run finishes before the first poll tick.
			wasRunning = (detail.value?.runs ?? []).some((run) => isInFlight(run.status));
		},
		{ immediate: true },
	);

	// Live updates: the store re-polls the collection detail every few seconds
	// while runs execute (replacing `detail.value` each tick). Piggyback on that to
	// silently refetch the per-case rows, so cases/scores stream in during the run
	// instead of freezing at the first (partially-seeded) snapshot. Fetch only runs
	// still in flight plus any that just reached a terminal state (their final
	// cases), each terminal run exactly once — completed runs' rows are immutable.
	// Fires once more on the running→settled transition, then stops.
	watch(
		() => detail.value,
		async () => {
			// The run-set watch above owns the first fetch; don't double-fetch until it lands.
			if (!casesLoaded.value) return;
			const runs = detail.value?.runs ?? [];
			const running = runs.some((run) => isInFlight(run.status));
			if (!running && !wasRunning) return;
			wasRunning = running;

			const toFetch = runs.filter(
				(run) => isInFlight(run.status) || !terminalFetched.has(run.testRunId),
			);
			if (toFetch.length === 0) return;
			await load({ silent: true, runs: toFetch });
			for (const run of toFetch) {
				if (!isInFlight(run.status)) terminalFetched.add(run.testRunId);
			}
		},
	);

	return { caseRows, mismatch, loading, casesLoaded, casesError, load };
}
