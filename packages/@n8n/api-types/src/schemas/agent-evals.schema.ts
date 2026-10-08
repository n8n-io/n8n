import type { IDataObject, JsonObject } from 'n8n-workflow';
import { z } from 'zod';

import { jsonValueSchema } from './json-value.schema';
import { datasetRefSchema, type DatasetRef } from '../dto/evaluations/evaluation-config.dto';
import {
	MAX_ITEMS_PER_PAGE,
	createTakeValidator,
	paginationSchema,
} from '../dto/pagination/pagination.dto';
import { Z } from '../zod-class';

// PostHog rollout flag id gating the agent-evals feature surface. Every new
// agent-eval endpoint + frontend entry point consults this; the flag-off
// cohort sees no agent-eval surface at all. Single source of truth shared
// between FE and BE so the two cannot drift. Follows the `NNN_<feature>`
// numeric-prefix convention used by every other n8n PostHog flag (next
// available after `100_n8n_credits_credential_selection`).
export const AGENT_EVALS_FLAG = '101_agent_evals';

// ---------------------------------------------------------------------------
// Shared value types — the FE/BE contract mirrored by the `@n8n/db` entities,
// which import these from here (as they already do for `DatasetRef`) rather
// than redefining them. This is the canonical home.
// ---------------------------------------------------------------------------

/**
 * Maps the roles an agent eval needs onto columns of the referenced dataset (a
 * Data Table or Google Sheet). Only `input` is required; without an
 * `expectedOutput`/`criteria` column a run simply has no reference answer or
 * per-case check to judge against.
 */
export const agentEvalColumnMappingSchema = z.object({
	input: z.string().min(1),
	expectedOutput: z.string().min(1).optional(),
	criteria: z.string().min(1).optional(),
});
export type AgentEvalColumnMapping = z.infer<typeof agentEvalColumnMappingSchema>;

export const agentEvalRunStatusSchema = z.enum([
	'new',
	'running',
	'completed',
	'error',
	'cancelled',
]);
export type AgentEvalRunStatus = z.infer<typeof agentEvalRunStatusSchema>;

export const agentEvalResultStatusSchema = z.enum([
	'new',
	'running',
	'success',
	'error',
	'cancelled',
]);
export type AgentEvalResultStatus = z.infer<typeof agentEvalResultStatusSchema>;

/**
 * LLM-as-judge verdict on a case's output against its rule (`criteria`) or
 * gold answer (`expectedOutput`). Set only after a successful execution —
 * `status: 'skipped'` means the case had neither to judge against, not that
 * judging failed. `'error'` means the judge call itself failed (timeout, bad
 * provider response); the case's own `status: 'success'` is unaffected, since
 * grading is best-effort on top of an already-successful run.
 */
export const agentEvalVerdictStatusSchema = z.enum(['skipped', 'completed', 'error']);
export type AgentEvalVerdictStatus = z.infer<typeof agentEvalVerdictStatusSchema>;

// The judge's pass/fail call — named `outcome` (not `verdict`) on the object
// below to avoid `AgentEvalVerdict.verdict`, a field self-referencing its own
// container's name.
export const agentEvalVerdictOutcomeSchema = z.enum(['pass', 'fail']);
export type AgentEvalVerdictOutcome = z.infer<typeof agentEvalVerdictOutcomeSchema>;

export const agentEvalVerdictSchema = z.object({
	status: agentEvalVerdictStatusSchema,
	/** Only set when `status` is `'completed'`. */
	outcome: agentEvalVerdictOutcomeSchema.nullable(),
	/** The judge's explanation, or the error message when `status` is `'error'`. */
	reasoning: z.string().nullable(),
	/** One instruction that would fix a failed rule. Only set on a `fail` outcome, and absent on older rows. */
	suggestion: z.string().nullable().optional(),
});
export type AgentEvalVerdict = z.infer<typeof agentEvalVerdictSchema>;

export const agentEvalVoteSchema = z.enum(['up', 'down']);
export type AgentEvalVote = z.infer<typeof agentEvalVoteSchema>;

// ---------------------------------------------------------------------------
// Request DTOs. Parent resource ids (datasetId, resultId) are path params, so
// they are not part of these bodies. Flat bodies use `Z.class` for controller
// `@Body` binding; the dataset-create body carries the `DatasetRef` union, so
// it follows the `UpsertEvaluationConfigDto` pattern (schema + inferred type)
// which `Z.class` (flat shape only) cannot express.
// ---------------------------------------------------------------------------

// `agentId` is also a path param on the create route; the API rejects a mismatch
// rather than picking a winner.
export const createAgentEvalDatasetSchema = z
	.object({
		name: z.string().min(1).max(128),
		description: z.string().nullable().optional(),
		agentId: z.string().min(1),
		columnMapping: agentEvalColumnMappingSchema.nullable().optional(),
	})
	.and(datasetRefSchema);
export type CreateAgentEvalDatasetDto = z.infer<typeof createAgentEvalDatasetSchema>;

// Metadata patch only; changing the dataset source is a new dataset, so the
// `DatasetRef` union is intentionally not part of the update body.
const updateAgentEvalDatasetShape = {
	name: z.string().min(1).max(128).optional(),
	description: z.string().nullable().optional(),
	columnMapping: agentEvalColumnMappingSchema.nullable().optional(),
};
export const updateAgentEvalDatasetSchema = z.object(updateAgentEvalDatasetShape);
export type UpdateAgentEvalDatasetPayload = z.infer<typeof updateAgentEvalDatasetSchema>;
export class UpdateAgentEvalDatasetDto extends Z.class(updateAgentEvalDatasetShape) {}

// Kicks off a run of the path dataset. `agentVersionId` would pin a published
// version, but the API rejects it until the runner can execute a snapshot.
const createAgentEvalRunShape = {
	agentVersionId: z.string().min(1).optional(),
};
export const createAgentEvalRunSchema = z.object(createAgentEvalRunShape);
export type CreateAgentEvalRunPayload = z.infer<typeof createAgentEvalRunSchema>;
export class CreateAgentEvalRunDto extends Z.class(createAgentEvalRunShape) {}

// Wider default than the shared `PaginationDto`: opening a run reads its cases,
// of which there are many, so 10 would page immediately for no reason.
export const AGENT_EVAL_RESULTS_DEFAULT_TAKE = 50;
export class AgentEvalRunDetailQueryDto extends Z.class({
	...paginationSchema,
	take: createTakeValidator(MAX_ITEMS_PER_PAGE, false, AGENT_EVAL_RESULTS_DEFAULT_TAKE),
}) {}

// A correction carries the edited answer under `finalText`, mirroring the key the
// runner writes into a result's `output` so calibration can diff the two directly.
// Required when a correction is sent: a correction without it persists a rating
// that claims an edit no consumer can read. `catchall` keeps richer corrections
// (per-field edits, structured output) possible without a migration, and infers to
// the repository's `JsonObject` rather than `Record<string, unknown>`.
export const agentEvalCorrectionSchema = z
	.object({ finalText: z.string().trim().min(1) })
	.catchall(jsonValueSchema);
export type AgentEvalCorrection = z.infer<typeof agentEvalCorrectionSchema>;

// Bounds on the free-text a rating carries. The schema can't enforce them —
// `comment` has no `.max()` because the rating service checks it alongside the
// whole-correction size limit, which zod can't express — so they live here to be
// read by both that service and the editor, rather than restated in each.
export const AGENT_EVAL_MAX_COMMENT_CHARS = 2_000;
export const AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS = 20_000;

// A human's 👍/👎 on the path result, with an optional free-text comment and an
// edited "should have been" output.
const createAgentEvalRatingShape = {
	vote: agentEvalVoteSchema,
	comment: z.string().optional(),
	correction: agentEvalCorrectionSchema.optional(),
};
export const createAgentEvalRatingSchema = z.object(createAgentEvalRatingShape);
export type CreateAgentEvalRatingPayload = z.infer<typeof createAgentEvalRatingSchema>;
export class CreateAgentEvalRatingDto extends Z.class(createAgentEvalRatingShape) {}

// ---------------------------------------------------------------------------
// Response shapes: plain types (not zod) so the server needn't round-trip its
// own output through validation. Dates are serialized as ISO strings; internal
// coordination columns (`runningInstanceId`, `cancelRequested`) are omitted
// from the contract.
//
// JSON blobs mirror the type their entity column stores, so consumers needn't
// re-narrow `unknown` on every read.
// ---------------------------------------------------------------------------

/** One page of a list route. `count` is the total matching rows, not the page length. */
export type AgentEvalPage<T> = {
	count: number;
	data: T[];
};

export type AgentEvalDatasetRecord = {
	id: string;
	name: string;
	description: string | null;
	agentId: string;
	columnMapping: AgentEvalColumnMapping | null;
	createdById: string | null;
	createdAt: string;
	updatedAt: string;
} & DatasetRef;

export type AgentEvalRunRecord = {
	id: string;
	datasetId: string;
	agentVersionId: string | null;
	status: AgentEvalRunStatus;
	runAt: string | null;
	completedAt: string | null;
	metrics: IDataObject | null;
	errorCode: string | null;
	errorDetails: IDataObject | null;
	createdById: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AgentEvalResultRecord = {
	id: string;
	runId: string;
	sourceRowId: string | null;
	runIndex: number | null;
	status: AgentEvalResultStatus;
	input: JsonObject | null;
	output: JsonObject | null;
	toolCalls: JsonObject | null;
	metrics: IDataObject | null;
	verdict: AgentEvalVerdict | null;
	runAt: string | null;
	completedAt: string | null;
	errorCode: string | null;
	errorDetails: IDataObject | null;
	createdAt: string;
	updatedAt: string;
};

export type AgentEvalRatingRecord = {
	id: string;
	resultId: string;
	vote: AgentEvalVote;
	comment: string | null;
	correction: JsonObject | null;
	ratedById: string | null;
	createdAt: string;
	updatedAt: string;
};

// Runs of a dataset, newest first. Paginated because nothing caps how many a
// dataset accumulates — every "Run all" adds one.
export type AgentEvalRunList = AgentEvalPage<AgentEvalRunRecord>;

// A run with a page of its per-case results — the "open a run" view. Paginated
// because each row carries its full input/output JSON.
export type AgentEvalRunDetail = AgentEvalRunRecord & {
	results: AgentEvalPage<AgentEvalResultRecord>;
};

// The progress-polling shape: status plus tallies, no per-case rows, so polling
// stays cheap. `pending` folds `new` + `running` — watchers only need "not settled".
export type AgentEvalRunSummary = {
	runId: string;
	status: AgentEvalRunStatus;
	counts: { total: number; success: number; error: number; cancelled: number; pending: number };
};

// ---------------------------------------------------------------------------
// Case generation. The AI case-generation service drafts cases from an agent's
// config; these types are the shared contract for its request/response so the
// generate endpoint and editor-ui use one definition (the service impl and its
// synthesis logic live in the backend).
// ---------------------------------------------------------------------------

/**
 * A single AI-generated draft eval case: a realistic end-user input plus a
 * plain-language "what to check". Drafts have no gold answer and are never
 * auto-graded — the user edits them before saving as a dataset.
 */
export const agentEvalDraftCaseSchema = z.object({
	input: z.string().min(1),
	whatToCheck: z.string().min(1),
	/** One or two words naming the kind of scenario the case exercises, e.g. "Vague", "Sensitive data", "Upset". */
	scenario: z.string().min(1),
});
export type AgentEvalDraftCase = z.infer<typeof agentEvalDraftCaseSchema>;

// Request body for the generate-cases endpoint. `count` is a positive int; the
// service clamps it to its supported maximum rather than rejecting.
//
// `suggestion`/`previousInput`/`previousOutput` ask for a single replacement
// case instead of fresh ones: feedback on a case that already ran, plus what it
// ran with. The service only treats this as a revision when `suggestion` and
// `previousInput` are set — `previousOutput` may be empty, since a case that
// errored or never finished has no output to show.
//
// `exampleInput`/`exampleOutput` are a known-good pair — one the user already
// approved — grounding fresh generations in that same style and scope. The
// service only uses this when both are set.
//
// `rule` is a rule the agent must follow, written by the user. It asks for one
// case: a user message that tests that rule. The count is ignored, like a
// revision's.
//
// `save` defaults to true (persist a dataset, as this endpoint always has).
// `save: false` skips persistence entirely — no Data Table, no dataset row —
// so a caller can preview drafts (e.g. before the user has committed to any
// of them) without leaving an empty, never-run dataset behind on a refresh.
const generateDraftCasesOptionsShape = {
	count: z.number().int().min(1).optional(),
	datasetName: z.string().min(1).optional(),
	suggestion: z.string().min(1).optional(),
	previousInput: z.string().min(1).optional(),
	previousOutput: z.string().optional(),
	exampleInput: z.string().min(1).optional(),
	exampleOutput: z.string().min(1).optional(),
	rule: z.string().trim().min(1).optional(),
	save: z.boolean().optional(),
};
export const generateDraftCasesOptionsSchema = z.object(generateDraftCasesOptionsShape);
export type GenerateDraftCasesOptions = z.infer<typeof generateDraftCasesOptionsSchema>;
export class GenerateDraftCasesOptionsDto extends Z.class(generateDraftCasesOptionsShape) {}

/** `datasetId`/`dataTableId` are absent when called with `save: false`. */
export type GenerateDraftCasesResult = {
	datasetId?: string;
	dataTableId?: string;
	cases: AgentEvalDraftCase[];
};

// Request body for the draft-dataset endpoint: creates an empty dataset (a
// Data Table with the same columns case generation writes, plus its pointer
// row) and nothing else — no LLM call, no rows. Lets a caller turn a `save:
// false` preview into a real, run-able dataset once the user commits to it,
// without regenerating or guessing the column names.
const createDraftDatasetOptionsShape = {
	datasetName: z.string().min(1).optional(),
};
export const createDraftDatasetOptionsSchema = z.object(createDraftDatasetOptionsShape);
export type CreateDraftDatasetOptions = z.infer<typeof createDraftDatasetOptionsSchema>;
export class CreateDraftDatasetOptionsDto extends Z.class(createDraftDatasetOptionsShape) {}

export type CreateDraftDatasetResult = {
	datasetId: string;
	dataTableId: string;
	/** Lets the caller resolve a writable `CaseSource` straight from this result,
	 *  instead of re-reading the dataset list to find the row it just created. */
	columnMapping: AgentEvalColumnMapping;
};

// Request body for the preview-run endpoint: drafts exactly one case (the
// same way `generateDraftCases` would with `count: 1, save: false`) and
// immediately executes it against the agent through the same path Preview
// Chat uses — no Data Table, no dataset, no eval-run row. Lets "try it once"
// (and its "needs work" retries) run freely without leaving anything behind.
const previewRunOptionsShape = {
	suggestion: z.string().min(1).optional(),
	previousInput: z.string().min(1).optional(),
	previousOutput: z.string().optional(),
};
export const previewRunOptionsSchema = z.object(previewRunOptionsShape);
export type PreviewRunOptions = z.infer<typeof previewRunOptionsSchema>;
export class PreviewRunOptionsDto extends Z.class(previewRunOptionsShape) {}

/**
 * `failed` covers every non-completed outcome (a suspended tool approval, a
 * misconfigured agent, an empty draft) — the preview has no UI for resuming
 * an approval or surfacing missing config, so all of them read the same way
 * the eval-run version did: a generic "didn't complete" failure.
 */
export type PreviewRunResult =
	| {
			status: 'completed';
			input: string;
			whatToCheck: string;
			scenario: string;
			response: string;
			/** The judge's call on the response against `whatToCheck`. A judge failure is an `error` verdict, never a `failed` preview. */
			verdict: AgentEvalVerdict;
	  }
	| { status: 'failed' };

// Request body for rerunning one already-seeded result in place. `whatToCheck`
// is optional: a plain "Run check" repeats the case as-is, while editing the
// rule from the checks view (which has no editable case row of its own, only
// the result's own snapshot) bundles the new text into the same request —
// persisted onto the result's snapshot before it re-executes.
const rerunResultOptionsShape = {
	whatToCheck: z.string().trim().min(1).optional(),
};
export const rerunResultOptionsSchema = z.object(rerunResultOptionsShape);
export type RerunResultOptions = z.infer<typeof rerunResultOptionsSchema>;
export class RerunResultOptionsDto extends Z.class(rerunResultOptionsShape) {}

// Applies the fix suggestions stored on failed results: the backend rewrites the
// agent's instructions once to include all of them, then reruns only these results.
export const MAX_APPLY_SUGGESTIONS = 10;
const applyAgentEvalSuggestionsShape = {
	resultIds: z.array(z.string().min(1)).min(1).max(MAX_APPLY_SUGGESTIONS),
};
export const applyAgentEvalSuggestionsSchema = z.object(applyAgentEvalSuggestionsShape);
export type ApplyAgentEvalSuggestionsOptions = z.infer<typeof applyAgentEvalSuggestionsSchema>;
export class ApplyAgentEvalSuggestionsDto extends Z.class(applyAgentEvalSuggestionsShape) {}

export type ApplyAgentEvalSuggestionsResult = {
	/** Hash of the saved agent config, so the editor can adopt it without a conflict. */
	configHash: string;
	/** The reran results, in the order they were requested. */
	results: AgentEvalResultRecord[];
};
