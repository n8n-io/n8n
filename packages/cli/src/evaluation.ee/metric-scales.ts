import { metricScalesFromConfig, metricScalesFromSnapshot, type MetricScale } from '@n8n/api-types';
import type { EvaluationConfigRepository, TestRun } from '@n8n/db';

/**
 * Metric-name → scale map from a workflow's current eval config — the default
 * for runs without a usable snapshot, and an empty map (→ name-based
 * `normalizeMetricScore` fallback) when the config no longer exists. Shared by
 * the collection + insights services so scale resolution lives in one place.
 */
export async function resolveConfigMetricScales(
	evalConfigRepo: EvaluationConfigRepository,
	evaluationConfigId: string,
	workflowId: string,
): Promise<Record<string, MetricScale>> {
	const config = await evalConfigRepo.findByIdAndWorkflowId(evaluationConfigId, workflowId);
	return config ? metricScalesFromConfig(config.metrics) : {};
}

/**
 * A run's metric scales, resolved from its frozen config snapshot so its values
 * normalize on the scales they were produced with — not the collection's current
 * config, which may have changed since a run completed. Falls back to
 * `defaultScales` (the live-config map) for runs with no usable snapshot.
 */
export function runMetricScales(
	run: Pick<TestRun, 'evaluationConfigSnapshot'>,
	defaultScales: Record<string, MetricScale>,
): Record<string, MetricScale> {
	return metricScalesFromSnapshot(run.evaluationConfigSnapshot) ?? defaultScales;
}
