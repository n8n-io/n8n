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
		const counts = casesByVersion.value.map((cases) => cases.length);
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
					score: averageNormalizedScore(record?.metrics, detail.value?.metricScales),
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

	// Refetch whenever the run set changes. Key is `null` before detail loads and
	// `''` once loaded with no runs — distinguished so an empty collection still
	// runs `load()` instead of sitting in the loading state forever.
	watch(
		() => (detail.value ? (detail.value.runs ?? []).map((run) => run.testRunId).join(',') : null),
		async (key) => {
			if (key !== null) await load();
		},
		{ immediate: true },
	);

	return { caseRows, mismatch, loading, casesLoaded, casesError, load };
}
