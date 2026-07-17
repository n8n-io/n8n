import orderBy from 'lodash/orderBy';
import type { JsonObject } from 'n8n-workflow';
import { computed, ref, watch, type Ref } from 'vue';

import type { TestCaseExecutionRecord } from '../evaluation.api';
import { useEvaluationStore } from '../evaluation.store';
import type { EvaluationCollectionDetail } from '../evalCollections.types';
import { averageNormalizedScore, indexOfMax, stringifyValue } from '../evaluation.utils';

// One version's execution of a single aligned test case. `null`-valued fields
// mark a case that this version's run didn't cover (dataset drift).
export interface CompareCaseCell {
	versionIndex: number;
	testCaseId: string | null;
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
 * Loads per-case executions for every run in a collection and aligns them into
 * one row per test case across versions.
 *
 * There is no collection-level per-case endpoint and no case id shared across
 * runs, so this fans out `fetchTestCaseExecutions` per run and aligns cells by
 * `runIndex` (the seeded per-case sequence) — a version missing a case leaves a
 * null cell rather than shifting later cases into the wrong row. Divergent case
 * counts surface as a `mismatch` rather than silently misaligning rows.
 */
export function useCompareCases(
	detail: Ref<EvaluationCollectionDetail | null>,
	workflowId: Ref<string>,
) {
	const evaluationStore = useEvaluationStore();

	const loading = ref(false);
	// True once the current run set's per-case fetches have completed at least
	// once. Downstream gates (mismatch banner, telemetry) use this rather than
	// `!loading` so they can't act on the empty window before the first load or
	// on a superseded load's transient `loading = false`.
	const casesLoaded = ref(false);
	// True when any run's per-case fetch failed. Distinguishes a transient
	// failure from a real dataset mismatch — a failed run also comes back with
	// zero cases, which would otherwise read as "diverging case counts".
	const casesError = ref(false);

	// Monotonic token so a slow load for a previous collection can't flip state
	// out from under the collection the user has since switched to.
	let loadToken = 0;

	async function load() {
		const runs = detail.value?.runs ?? [];
		const token = ++loadToken;
		if (runs.length === 0) {
			loading.value = false;
			casesError.value = false;
			casesLoaded.value = true;
			return;
		}
		loading.value = true;
		casesLoaded.value = false;
		casesError.value = false;
		try {
			const results = await Promise.allSettled(
				runs.map(
					async (run) =>
						await evaluationStore.fetchTestCaseExecutions({
							workflowId: workflowId.value,
							runId: run.testRunId,
						}),
				),
			);
			// A newer load for a different run set has taken over — don't clobber it.
			if (token !== loadToken) return;
			casesError.value = results.some((result) => result.status === 'rejected');
			casesLoaded.value = true;
		} finally {
			if (token === loadToken) loading.value = false;
		}
	}

	// Per-run, sorted case lists. Bucket the shared (app-global, poll-mutated)
	// store map by `testRunId` in a single pass instead of re-scanning it per
	// run, then sort each run's bucket by the same [runIndex, runAt] ordering
	// the run-detail view uses so aligned positions map to the same seeded case.
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
		// Align cells by `runIndex` (the seeded per-case sequence), not list
		// position: a version missing a case in the middle must leave a null cell
		// in that row rather than shift every later case up and pair unrelated
		// inputs. Fall back to list position only when a record has no runIndex.
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
					inputs: record?.inputs,
					outputs: record?.outputs,
					metrics: record?.metrics,
					score: averageNormalizedScore(record?.metrics),
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

	// Refetch whenever the run set changes (collection switch reuses the view).
	// The key is `null` while the detail hasn't loaded and an empty string once
	// it has but with no runs — distinguishing them so an empty collection still
	// runs `load()` (which resolves its own empty-run completion state) instead
	// of sitting in the initial loading state forever.
	watch(
		() => (detail.value ? (detail.value.runs ?? []).map((run) => run.testRunId).join(',') : null),
		async (key) => {
			if (key !== null) await load();
		},
		{ immediate: true },
	);

	return { caseRows, mismatch, loading, casesLoaded, casesError, load };
}
