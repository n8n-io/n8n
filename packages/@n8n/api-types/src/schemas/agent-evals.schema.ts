import type { JsonObject, JsonValue } from 'n8n-workflow';
import { z } from 'zod';

import { datasetRefSchema, type DatasetRef } from '../dto/evaluations/evaluation-config.dto';
import { Z } from '../zod-class';

// A JSON blob that flows from a request into persistence must infer to the
// repository's `JsonObject`, not `Record<string, unknown>` — the latter permits
// non-JSON leaves and isn't assignable to `JsonObject` without a cast. Recursive
// so nested values are validated too.
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.record(z.string(), jsonValueSchema),
		z.array(jsonValueSchema),
	]),
);
const jsonObjectSchema: z.ZodType<JsonObject> = z.record(z.string(), jsonValueSchema);

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

export const agentEvalVoteSchema = z.enum(['up', 'down']);
export type AgentEvalVote = z.infer<typeof agentEvalVoteSchema>;

// ---------------------------------------------------------------------------
// Request DTOs. Parent resource ids (datasetId, resultId) are path params, so
// they are not part of these bodies. Flat bodies use `Z.class` for controller
// `@Body` binding; the dataset-create body carries the `DatasetRef` union, so
// it follows the `UpsertEvaluationConfigDto` pattern (schema + inferred type)
// which `Z.class` (flat shape only) cannot express.
// ---------------------------------------------------------------------------

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

// Kicks off a run of the path dataset. `agentVersionId` optionally pins a
// published version of the dataset's own agent; omitted runs the current one.
const createAgentEvalRunShape = {
	agentVersionId: z.string().min(1).optional(),
};
export const createAgentEvalRunSchema = z.object(createAgentEvalRunShape);
export type CreateAgentEvalRunPayload = z.infer<typeof createAgentEvalRunSchema>;
export class CreateAgentEvalRunDto extends Z.class(createAgentEvalRunShape) {}

// A human's 👍/👎 on the path result, with an optional free-text comment and an
// edited "should have been" output.
const createAgentEvalRatingShape = {
	vote: agentEvalVoteSchema,
	comment: z.string().optional(),
	correction: jsonObjectSchema.optional(),
};
export const createAgentEvalRatingSchema = z.object(createAgentEvalRatingShape);
export type CreateAgentEvalRatingPayload = z.infer<typeof createAgentEvalRatingSchema>;
export class CreateAgentEvalRatingDto extends Z.class(createAgentEvalRatingShape) {}

// ---------------------------------------------------------------------------
// Response shapes: plain types (not zod) so the server needn't round-trip its
// own output through validation. Dates are serialized as ISO strings; internal
// coordination columns (`runningInstanceId`, `cancelRequested`) are omitted
// from the contract.
// ---------------------------------------------------------------------------

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
	metrics: Record<string, unknown> | null;
	errorCode: string | null;
	errorDetails: Record<string, unknown> | null;
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
	input: Record<string, unknown> | null;
	output: Record<string, unknown> | null;
	toolCalls: Record<string, unknown> | null;
	metrics: Record<string, unknown> | null;
	runAt: string | null;
	completedAt: string | null;
	errorCode: string | null;
	errorDetails: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
};

export type AgentEvalRatingRecord = {
	id: string;
	resultId: string;
	vote: AgentEvalVote;
	comment: string | null;
	correction: Record<string, unknown> | null;
	ratedById: string | null;
	createdAt: string;
	updatedAt: string;
};

// A run with its per-case results — the "open a run" view.
export type AgentEvalRunDetail = AgentEvalRunRecord & {
	results: AgentEvalResultRecord[];
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
});
export type AgentEvalDraftCase = z.infer<typeof agentEvalDraftCaseSchema>;

// Request body for the generate-cases endpoint. `count` is a positive int; the
// service clamps it to its supported maximum rather than rejecting.
const generateDraftCasesOptionsShape = {
	count: z.number().int().min(1).optional(),
	datasetName: z.string().min(1).optional(),
};
export const generateDraftCasesOptionsSchema = z.object(generateDraftCasesOptionsShape);
export type GenerateDraftCasesOptions = z.infer<typeof generateDraftCasesOptionsSchema>;
export class GenerateDraftCasesOptionsDto extends Z.class(generateDraftCasesOptionsShape) {}

export type GenerateDraftCasesResult = {
	datasetId: string;
	dataTableId: string;
	cases: AgentEvalDraftCase[];
};
