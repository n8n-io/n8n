import { z } from 'zod';

import { Z } from '../zod-class';

// Mirrors the `TestRunStatus` union in `@n8n/db`. Duplicated here so
// `@n8n/api-types` does not need to depend on the db package.
export type EvalCollectionRunStatus = 'new' | 'running' | 'completed' | 'error' | 'cancelled';

// PostHog rollout flag id gating the eval-collections feature surface. All
// new endpoints + frontend entry points consult this; flag-off cohort sees
// the legacy single-run flow unchanged. Single source of truth shared
// between FE and BE so the two cannot drift. Matches the spec verbatim —
// the existing `080_eval_parallel_execution` flag follows a numeric-prefix
// convention but the spec called for the literal id here.
export const EVAL_COLLECTIONS_FLAG = 'eval_collections';

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
