import { computed, type Ref } from 'vue';

import { useI18n } from '@n8n/i18n';

import type { EvalCollectionRunStatus, EvaluationCollectionDetail } from '../evalCollections.types';
import { buildScoreShapedMetricGroups, formatMetricLabel } from '../evaluation.utils';
import { versionLetter } from '../components/shared/versionPalette';

// One column in the compare view: a single run positioned by `index`, which
// drives both its color (`versionColorVar`) and its letter (`versionLetter`).
export interface CompareVersion {
	index: number;
	testRunId: string;
	workflowVersionId: string | null;
	letter: string;
	label: string;
	status: EvalCollectionRunStatus;
	avgScore: number | null;
}

// One metric row in the hero chart: a value per version (aligned to the
// `versions` order; `null` where a run lacks the metric) plus which version
// scored highest so the legend/table can flag the winner.
export interface CompareMetricGroup {
	key: string;
	label: string;
	values: Array<number | null>;
	bestIndex: number | null;
}

export interface CompareData {
	versions: CompareVersion[];
	metricGroups: CompareMetricGroup[];
	// Version index with the highest overall `avgScore`, or null if none scored.
	bestVersionIndex: number | null;
}

// Index of the max value in `values`, ignoring nulls. Ties resolve to the
// first (left-most) version, matching the letter order users read.
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

/**
 * Shapes a collection's aggregate detail into the compare view's model:
 * one `CompareVersion` per run (in stored order) and one `CompareMetricGroup`
 * per score-shaped metric with per-version values aligned by version index.
 *
 * Only aggregate per-version metrics are read here — per-case data (Cases /
 * Outputs tabs) is fetched separately by those components.
 */
export function useCompareData(detail: Ref<EvaluationCollectionDetail | null>) {
	const i18n = useI18n();

	const versions = computed<CompareVersion[]>(() => {
		const runs = detail.value?.runs ?? [];
		return runs.map((run, index) => ({
			index,
			testRunId: run.testRunId,
			workflowVersionId: run.workflowVersionId,
			letter: versionLetter(index),
			label:
				run.workflowVersionId === null
					? i18n.baseText('evaluation.collections.card.currentDraft')
					: run.workflowVersionId.slice(0, 7),
			status: run.status,
			avgScore: run.avgScore,
		}));
	});

	const metricGroups = computed<CompareMetricGroup[]>(() =>
		buildScoreShapedMetricGroups(detail.value?.runs ?? []).map(({ key, values }) => ({
			key,
			label: formatMetricLabel(key),
			values,
			bestIndex: indexOfMax(values),
		})),
	);

	const bestVersionIndex = computed<number | null>(() =>
		indexOfMax(versions.value.map((version) => version.avgScore)),
	);

	const compareData = computed<CompareData | null>(() =>
		detail.value === null
			? null
			: {
					versions: versions.value,
					metricGroups: metricGroups.value,
					bestVersionIndex: bestVersionIndex.value,
				},
	);

	return { compareData };
}
