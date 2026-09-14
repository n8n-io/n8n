import type { MetricScale } from '@n8n/api-types';
import { computed, type Ref } from 'vue';

import { useI18n } from '@n8n/i18n';

import type { EvalCollectionRunStatus, EvaluationCollectionDetail } from '../evalCollections.types';
import { buildScoreShapedMetricGroups, formatMetricLabel, indexOfMax } from '../evaluation.utils';
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
	// This run's own metric scales (from its frozen config snapshot), so per-column
	// normalization uses the scales the values were produced with.
	metricScales?: Record<string, MetricScale>;
}

// One metric row in the hero chart: a value per version (aligned to `versions`
// order, `null` where a run lacks the metric) plus which version scored highest.
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

/**
 * Shapes a collection's aggregate detail into the compare view's model: one
 * `CompareVersion` per run and one `CompareMetricGroup` per score-shaped metric.
 * Only aggregate per-version metrics are read here — per-case data is fetched
 * separately by the Cases/Outputs components.
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
			metricScales: run.metricScales,
		}));
	});

	const metricGroups = computed<CompareMetricGroup[]>(() =>
		buildScoreShapedMetricGroups(detail.value?.runs ?? [], detail.value?.metricScales).map(
			({ key, values }) => ({
				key,
				label: formatMetricLabel(key),
				values,
				bestIndex: indexOfMax(values),
			}),
		),
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
