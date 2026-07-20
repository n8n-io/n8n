import { z } from 'zod';

import type { EvaluationMetric } from '../dto/evaluations/evaluation-config.dto';
import { Z } from '../zod-class';

// Mirrors the `TestRunStatus` union in `@n8n/db`. Duplicated here so
// `@n8n/api-types` does not need to depend on the db package.
export type EvalCollectionRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

// PostHog rollout flag id gating the eval-collections feature surface. All
// new endpoints + frontend entry points consult this; flag-off cohort sees
// the legacy single-run flow unchanged. Single source of truth shared
// between FE and BE so the two cannot drift. Follows the `NNN_<feature>`
// numeric-prefix convention used by every other n8n PostHog flag (next
// available after `083_canvas_nodes_grouping`).
export const EVAL_COLLECTIONS_FLAG = '084_eval_collections';

// Metric keys every run emits automatically (token counts + execution time).
// They're absolute operational values, not quality scores, so the "avg score"
// derivation and the score-shaped charts exclude them and count only
// user-defined metrics. Single-sourced so FE and BE agree on what a "score"
// is (the FE builds its `PREDEFINED_METRIC_KEYS` set from this).
export const RESERVED_METRIC_KEYS = [
	'promptTokens',
	'completionTokens',
	'totalTokens',
	'executionTime',
] as const;

// Preset LLM-as-judge metric names that historically returned a 1–5 rating.
// Kept as the NAME-based fallback for `normalizeMetricScore` (callers that
// can't resolve the metric's config) and as the source the FE's
// `getMetricCategory` uses to derive its `aiBased` category.
export const ONE_TO_FIVE_METRIC_KEYS = ['correctness', 'helpfulness'] as const;

/**
 * The scale a metric's raw value is expressed on, used to normalize it to a
 * [0, 1] score:
 *  - `unit`      — already a 0–1 fraction (deterministic scorers, expression
 *                  metrics returning a ratio).
 *  - `oneToFive` — a 1–5 rating (LLM-as-judge numeric metrics) → value / 5.
 *  - `boolean`   — a pass/fail outcome coerced to 0/1 (or an averaged pass
 *                  rate), clamped to [0, 1].
 *
 * Derived from the eval config via {@link metricScaleFromConfig}, not from the
 * metric's name, so a 1–5 judge metric works regardless of what the user named
 * it. Shared FE/BE so a "score" means the same thing everywhere.
 */
export type MetricScale = 'unit' | 'oneToFive' | 'boolean';

/**
 * Resolve the {@link MetricScale} for a metric from its eval-config definition:
 *  - a boolean-output metric (expression or LLM judge) → `boolean`
 *  - any other LLM judge (numeric 1–5 rating) → `oneToFive`
 *  - everything else (deterministic scorers, numeric expressions) → `unit`
 *
 * `config.outputType` only exists on the `expression` and `llm_judge` variants
 * of the discriminated union, so it's accessed behind a `type` guard.
 */
export function metricScaleFromConfig(metric: EvaluationMetric): MetricScale {
	// An LLM judge always scores on its 1–5 preset rubric. The workflow compiler
	// forwards only the judge's preset (correctness/helpfulness) and ignores its
	// `outputType`, so a judge's values are 1–5 regardless of a (meaningless)
	// boolean outputType — treating such a judge as boolean would clamp 3 and 5
	// both to 100%.
	if (metric.type === 'llm_judge') return 'oneToFive';
	// Only a deterministic expression scorer honors a boolean outputType (the
	// compiler coerces its value to 0/1).
	if (metric.type === 'expression' && metric.config.outputType === 'boolean') return 'boolean';
	return 'unit';
}

/**
 * Build a metric-name → {@link MetricScale} map from an eval config's metrics.
 * The map keys `normalizeMetricScore` calls so scores normalize by scale
 * regardless of what the user named the metric. Shared by the FE + BE scoring
 * paths so a "score" means the same thing everywhere.
 */
export function metricScalesFromConfig(metrics: EvaluationMetric[]): Record<string, MetricScale> {
	const scaleByMetric: Record<string, MetricScale> = {};
	for (const metric of metrics) {
		scaleByMetric[metric.name] = metricScaleFromConfig(metric);
	}
	return scaleByMetric;
}

/**
 * Normalize a raw metric value to a [0, 1] "score", or return null when the
 * metric isn't a score we can chart/average:
 *  - reserved operational metrics (token counts, execution time) → null
 *  - NaN → null
 *  - `oneToFive` scale → value / 5
 *  - `boolean` scale → clamped to [0, 1] (a coerced 0/1 or an averaged pass rate)
 *  - `unit` scale → passed through only if already in [0, 1]; an unknown-scale
 *    value outside that range can't be meaningfully scaled, so it's excluded
 *    rather than rendered as a bogus percentage.
 *
 * `scale` is resolved from the eval config by callers that have it. When
 * omitted it falls back to the legacy NAME-based heuristic (the preset judge
 * keys are 1–5, everything else is unit) so callers without config context —
 * and existing tests — keep their behavior.
 *
 * Shared by the FE compare surfaces and the BE avg-score/insights derivation
 * so a "score" means the same thing everywhere.
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

// Per-version entry on a create-collection request. Either reference an
// existing test run (`existingTestRunId`) to reuse it, or omit it and the
// service will schedule a fresh run pinned to `workflowVersionId`. A null
// `workflowVersionId` means "current draft" — the service snapshots a new
// `WorkflowHistory` row at run start so the run stays comparable.
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

// Response shapes. These are not validated input — they describe what the
// server returns. Keeping them as plain TypeScript types (not zod schemas)
// avoids forcing the server to round-trip its own outputs through zod.

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
	// Per-metric scale (metric name → scale) derived from the collection's eval
	// config. Lets the FE normalize scores by scale instead of by metric name,
	// so a 1–5 judge metric renders correctly whatever it's named. Optional:
	// absent for legacy/config-less responses, where callers fall back to the
	// name-based heuristic in `normalizeMetricScore`.
	metricScales?: Record<string, MetricScale>;
};

// Versions-picker endpoint response. The setup wizard renders one row per
// item; `lastRun = null` means "no run yet · will run new" in the UI.
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
