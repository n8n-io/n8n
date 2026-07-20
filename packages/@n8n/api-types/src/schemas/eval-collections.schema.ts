import { z } from 'zod';

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

// User-defined metrics whose LLM-as-judge handlers return a 1–5 rating (rather
// than a 0–1 fraction). Every other user metric is assumed already normalized
// to [0, 1]. Single-sourced so FE and BE agree; the FE's `getMetricCategory`
// derives its `aiBased` category from this list.
export const ONE_TO_FIVE_METRIC_KEYS = ['correctness', 'helpfulness'] as const;

/**
 * Normalize a raw metric value to a [0, 1] "score", or return null when the
 * metric isn't a score we can chart/average:
 *  - reserved operational metrics (token counts, execution time) → null
 *  - 1–5 AI-judge metrics → value / 5
 *  - any other metric → passed through only if already in [0, 1]; an
 *    unknown-scale value outside that range can't be meaningfully scaled, so
 *    it's excluded rather than rendered as a bogus percentage.
 *
 * Shared by the FE compare surfaces and the BE avg-score/insights derivation
 * so a "score" means the same thing everywhere.
 */
export function normalizeMetricScore(key: string, value: number): number | null {
	if ((RESERVED_METRIC_KEYS as readonly string[]).includes(key)) return null;
	if (Number.isNaN(value)) return null;
	const normalized = (ONE_TO_FIVE_METRIC_KEYS as readonly string[]).includes(key)
		? value / 5
		: value;
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
