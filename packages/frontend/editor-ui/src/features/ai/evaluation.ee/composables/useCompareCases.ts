import orderBy from 'lodash/orderBy';
import type { JsonObject } from 'n8n-workflow';
import { computed, ref, watch, type Ref } from 'vue';

import type { TestCaseExecutionRecord, TestCaseExecutionStatus } from '../evaluation.api';
import { useEvaluationStore } from '../evaluation.store';
import type { EvaluationCollectionDetail } from '../evalCollections.types';
import {
	getUserDefinedMetricNames,
	isScoreShapedMetric,
	stringifyValue,
} from '../evaluation.utils';

// One version's execution of a single aligned test case. `null`-valued fields
// mark a case that this version's run didn't cover (dataset drift).
export interface CompareCaseCell {
	versionIndex: number;
	testCaseId: string | null;
	status: TestCaseExecutionStatus | null;
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

// Mean of a case's score-shaped metrics, mirroring the hero chart's metric
// selection so a case score and the aggregate bars can't disagree on which
// metrics count.
function caseScore(metrics: Record<string, number> | undefined): number | null {
	if (!metrics) return null;
	const values = getUserDefinedMetricNames(metrics)
		.map((key) => metrics[key])
		.filter(isScoreShapedMetric);
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function indexOfMax(values: Array<number | null>): number | null {
	let best: number | null = null;
	let bestValue = -Infinity;
	values.forEach((value, index) => {
		if (value !== null && value > bestValue) {
			bestValue = value;
			best = index;
		}
	});
	return best;
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
 * runs, so this fans out `fetchTestCaseExecutions` per run and aligns by sorted
 * `runIndex` position (the ordering the run-detail view uses). Divergent case
 * counts surface as a `mismatch` rather than silently misaligning rows.
 */
export function useCompareCases(
	detail: Ref<EvaluationCollectionDetail | null>,
	workflowId: Ref<string>,
) {
	const evaluationStore = useEvaluationStore();

	const loading = ref(false);
	// True when any run's per-case fetch failed. Distinguishes a transient
	// failure from a real dataset mismatch — a failed run also comes back with
	// zero cases, which would otherwise read as "diverging case counts".
	const casesError = ref(false);

	async function load() {
		const runs = detail.value?.runs ?? [];
		if (runs.length === 0) return;
		loading.value = true;
		casesError.value = false;
		try {
			const results = await Promise.allSettled(
				runs.map((run) =>
					evaluationStore.fetchTestCaseExecutions({
						workflowId: workflowId.value,
						runId: run.testRunId,
					}),
				),
			);
			casesError.value = results.some((result) => result.status === 'rejected');
		} finally {
			loading.value = false;
		}
	}

	// Per-run, sorted case lists — same [runIndex, runAt] ordering as the
	// run-detail view so aligned positions map to the same seeded case.
	const casesByVersion = computed<TestCaseExecutionRecord[][]>(() => {
		const runs = detail.value?.runs ?? [];
		return runs.map((run) =>
			orderBy(
				Object.values(evaluationStore.testCaseExecutionsById).filter(
					(record) => record.testRunId === run.testRunId,
				),
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
		const versions = casesByVersion.value;
		const rowCount = mismatch.value.maxCount;
		const rows: CompareCaseRow[] = [];

		for (let index = 0; index < rowCount; index++) {
			const cells: CompareCaseCell[] = versions.map((cases, versionIndex) => {
				const record = cases[index];
				return {
					versionIndex,
					testCaseId: record?.id ?? null,
					status: record?.status ?? null,
					inputs: record?.inputs,
					outputs: record?.outputs,
					metrics: record?.metrics,
					score: caseScore(record?.metrics),
				};
			});

			const firstWithInputs = cells.find((cell) => cell.inputs !== undefined);
			rows.push({
				index,
				displayIndex: index + 1,
				inputPreview: inputPreview(firstWithInputs?.inputs),
				cells,
				bestVersionIndex: indexOfMax(cells.map((cell) => cell.score)),
			});
		}

		return rows;
	});

	// Refetch whenever the run set changes (collection switch reuses the view).
	watch(
		() => (detail.value?.runs ?? []).map((run) => run.testRunId).join(','),
		async (next) => {
			if (next) await load();
		},
		{ immediate: true },
	);

	return { caseRows, mismatch, loading, casesError, load };
}
