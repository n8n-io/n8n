import { z } from 'zod';

import type { EvaluationMetric } from '../dto/evaluations/evaluation-config.dto';
import { Z } from '../zod-class';

// Mirrors the `TestRunStatus` union in `@n8n/db`. Duplicated here so
// `@n8n/api-types` does not need to depend on the db package.
export type EvalCollectionRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

// PostHog rollout flag gating the eval-collections feature. Single-sourced so
// FE and BE can't drift; follows the `NNN_<feature>` PostHog flag convention.
export const EVAL_COLLECTIONS_FLAG = '084_eval_collections';

// Operational metrics every run emits (token counts + execution time). Not
// quality scores, so score derivations and charts exclude them.
export const RESERVED_METRIC_KEYS = [
	'promptTokens',
	'completionTokens',
	'totalTokens',
	'executionTime',
] as const;

// Preset LLM-judge metrics that return a 1–5 rating. The name-based fallback
// for `normalizeMetricScore` when a caller can't resolve the metric's config.
export const ONE_TO_FIVE_METRIC_KEYS = ['correctness', 'helpfulness'] as const;

/**
 * Scale a metric's raw value is on, used to normalize it to [0, 1]: `unit`
 * (already 0–1), `oneToFive` (1–5 rating → /5), `boolean` (pass/fail, clamped).
 * Derived from the config (not the metric name) via {@link metricScaleFromConfig}.
 */
export type MetricScale = 'unit' | 'oneToFive' | 'boolean';

/** Resolve a metric's {@link MetricScale} from its eval-config definition. */
export function metricScaleFromConfig(metric: EvaluationMetric): MetricScale {
	// A judge always scores 1–5 on its preset rubric — the compiler forwards only
	// the preset and ignores outputType, so a boolean outputType here is
	// meaningless (treating it as boolean would clamp both 3 and 5 to 100%).
	if (metric.type === 'llm_judge') return 'oneToFive';
	if (metric.type === 'expression' && metric.config.outputType === 'boolean') return 'boolean';
	return 'unit';
}

/** Build a metric-name → {@link MetricScale} map from a config's metrics. */
export function metricScalesFromConfig(metrics: EvaluationMetric[]): Record<string, MetricScale> {
	const scaleByMetric: Record<string, MetricScale> = {};
	for (const metric of metrics) {
		scaleByMetric[metric.name] = metricScaleFromConfig(metric);
	}
	return scaleByMetric;
}

/**
 * Normalize a raw metric value to a [0, 1] score, or null when it isn't a
 * chartable score (reserved operational metric, NaN, or an unknown-scale value
 * outside [0, 1]). `scale` comes from the eval config; when omitted it falls
 * back to the name-based heuristic (preset judge keys are 1–5, else unit).
 */
export function normalizeMetricScore(
	key: string,
	value: number,
	scale?: MetricScale,
): number | null {
	if ((RESERVED_METRIC_KEYS as readonly string[]).includes(key)) return null;
	if (Number.isNaN(value)) return null;

	const resolvedScale: MetricScale =
		scale ?? ((ONE_TO_FIVE_METRIC_KEYS as readonly string[]).includes(key) ? 'oneToFive' : 'unit');

	let normalized: number;
	switch (resolvedScale) {
		case 'oneToFive':
			normalized = value / 5;
			break;
		case 'boolean':
			normalized = Math.min(1, Math.max(0, value));
			break;
		case 'unit':
			normalized = value;
			break;
	}

	return normalized >= 0 && normalized <= 1 ? normalized : null;
}

/**
 * Per-metric scores normalized to [0, 1] by scale (via {@link normalizeMetricScore});
 * operational/unknown-scale values are dropped and booleans coerce to 0/1. The
 * single definition shared by the FE compare surfaces and the BE insights agent so
 * they can't disagree on which metrics count or how they're scaled.
 */
export function normalizedScores(
	metrics: Record<string, number | boolean> | null | undefined,
	scaleByMetric: Record<string, MetricScale> = {},
): Record<string, number> {
	const out: Record<string, number> = {};
	if (!metrics) return out;
	for (const [key, raw] of Object.entries(metrics)) {
		const value = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw;
		if (typeof value !== 'number') continue;
		const score = normalizeMetricScore(key, value, scaleByMetric[key]);
		if (score !== null) out[key] = score;
	}
	return out;
}

/** Mean of the normalized score metrics, or null when none qualify. */
export function averageNormalizedScore(
	metrics: Record<string, number | boolean> | null | undefined,
	scaleByMetric: Record<string, MetricScale> = {},
): number | null {
	const values = Object.values(normalizedScores(metrics, scaleByMetric));
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// One version on a create-collection request: reference an existing run to
// reuse it, or omit it to schedule a fresh run pinned to `workflowVersionId`.
// `workflowVersionId: null` = "current draft", snapshotted at run start.
export const evalCollectionVersionEntrySchema = z.object({
	workflowVersionId: z.string().min(1).nullable(),
	existingTestRunId: z.string().min(1).optional(),
	label: z.string().min(1).max(128).optional(),
});

export type EvalCollectionVersionEntry = z.infer<typeof evalCollectionVersionEntrySchema>;

const createEvaluationCollectionShape = {
	name: z.string().min(1).max(128),
	description: z.string().nullable().optional(),
	evaluationConfigId: z.string().min(1),
	versions: z.array(evalCollectionVersionEntrySchema).min(1),
	concurrency: z.number().int().min(1).max(10).optional(),
};

export const createEvaluationCollectionSchema = z.object(createEvaluationCollectionShape);
export type CreateEvaluationCollectionPayload = z.infer<typeof createEvaluationCollectionSchema>;

export class CreateEvaluationCollectionDto extends Z.class(createEvaluationCollectionShape) {}

const updateEvaluationCollectionShape = {
	name: z.string().min(1).max(128).optional(),
	description: z.string().nullable().optional(),
};

export const updateEvaluationCollectionSchema = z.object(updateEvaluationCollectionShape);
export type UpdateEvaluationCollectionPayload = z.infer<typeof updateEvaluationCollectionSchema>;

export class UpdateEvaluationCollectionDto extends Z.class(updateEvaluationCollectionShape) {}

const addRunToCollectionShape = {
	testRunId: z.string().min(1),
};

export const addRunToCollectionSchema = z.object(addRunToCollectionShape);
export type AddRunToCollectionPayload = z.infer<typeof addRunToCollectionSchema>;

export class AddRunToCollectionDto extends Z.class(addRunToCollectionShape) {}

// Response shapes: plain types (not zod) so the server needn't round-trip its
// own output through validation.

export type EvaluationCollectionRecord = {
	id: string;
	name: string;
	description: string | null;
	workflowId: string;
	evaluationConfigId: string;
	createdById: string | null;
	createdAt: string;
	updatedAt: string;
	runCount: number;
};

export type EvaluationCollectionRunSummary = {
	testRunId: string;
	workflowVersionId: string | null;
	status: EvalCollectionRunStatus;
	runAt: string | null;
	completedAt: string | null;
	avgScore: number | null;
	metrics: Record<string, number> | null;
};

export type EvaluationCollectionDetail = EvaluationCollectionRecord & {
	runs: EvaluationCollectionRunSummary[];
	// Metric name → scale, derived from the config, so the FE normalizes by scale
	// not by name. Absent for config-less responses (name-based fallback applies).
	metricScales?: Record<string, MetricScale>;
};

// Versions-picker response; one row per item. `lastRun = null` → "will run new".
export type EvalVersionEntry = {
	workflowVersionId: string | null;
	label: string;
	sourceLabel: string;
	isCurrent: boolean;
	lastRun: {
		testRunId: string;
		runAt: string;
		status: EvalCollectionRunStatus;
		avgScore: number | null;
		isBest: boolean;
		isCritical: boolean;
	} | null;
};

export type EvalVersionsResponse = {
	evaluationConfigId: string;
	versions: EvalVersionEntry[];
};
