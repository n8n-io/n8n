import { z } from 'zod';

import { Z } from '../zod-class';

// Named WorkflowEvalDatasetRow to avoid a name collision with `DatasetRow`
// exported from `@n8n/agents`, which has different semantics (narrower shape
// for agent-level evals vs. free-form workflow test rows).
//
// Values are constrained to strings: the AI wizard's eval-planner is required
// to stringify any structured value (a JSON array, an object, a number) into
// a single string cell, so the data table holds purely flat string rows. This
// avoids `[object Object]` rendering bugs when nested values reach the table
// and forces the LLM to make the structural choice explicitly.
export const workflowEvalDatasetRowSchema = z.record(z.string());
export type WorkflowEvalDatasetRow = z.infer<typeof workflowEvalDatasetRowSchema>;

// A single metric the AI wizard wants to compute against the LLM node's
// output. The wizard apply step is responsible for *where* the metric lives
// in the graph; the agent only proposes *what* to measure.
export const evalMetricSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
});
export type EvalMetric = z.infer<typeof evalMetricSchema>;

export const evalPlanSchema = z.object({
	datasetRows: z.array(workflowEvalDatasetRowSchema),
	metrics: z.array(evalMetricSchema),
});
export type EvalPlan = z.infer<typeof evalPlanSchema>;

// concurrency is clamped 1–10 by the schema; when omitted or when the
// feature flag is off, the runner falls back to sequential execution.
const startTestRunPayloadShape = {
	concurrency: z.number().int().min(1).max(10).optional(),
};
export const startTestRunPayloadSchema = z.object(startTestRunPayloadShape);
export type StartTestRunPayload = z.infer<typeof startTestRunPayloadSchema>;

// Controller-side DTO used by the @Body decorator's reflection-based validation.
// Shares the same shape as `startTestRunPayloadSchema` — single source of truth
// so the two validators cannot silently diverge.
export class StartTestRunRequestDto extends Z.class(startTestRunPayloadShape) {}

// Request body for POST /instance-ai/eval-plan — the AI-wizard bootstrap
// endpoint. Response shape is `EvalPlan` above. `userIntent` is optional in
// this shape because the wizard auto-derives most context from the named
// LLM node; the user only contributes intent if they want to bias the plan.
export class EvalPlanRequestDto extends Z.class({
	workflowId: z.string().min(1),
	llmNodeName: z.string().min(1),
	userIntent: z.string().max(2000).optional(),
}) {}
