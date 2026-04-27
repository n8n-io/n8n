import { z } from 'zod';

import { Z } from '../zod-class';

// Named WorkflowEvalDatasetRow to avoid a name collision with `DatasetRow`
// exported from `@n8n/agents`, which has different semantics (narrower shape
// for agent-level evals vs. free-form workflow test rows).
export const workflowEvalDatasetRowSchema = z.record(z.unknown());
export type WorkflowEvalDatasetRow = z.infer<typeof workflowEvalDatasetRowSchema>;

export const evalNodePlacementSchema = z.object({
	kind: z.enum(['trigger', 'setInputs', 'setMetrics']),
	afterNodeName: z.string().optional(),
	config: z.record(z.unknown()),
});
export type EvalNodePlacement = z.infer<typeof evalNodePlacementSchema>;

export const evalPlanSchema = z.object({
	datasetRows: z.array(workflowEvalDatasetRowSchema),
	nodePlacements: z.array(evalNodePlacementSchema),
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
// endpoint. Response shape is `EvalPlan` above.
export class EvalPlanRequestDto extends Z.class({
	workflowId: z.string().min(1),
	userIntent: z.string().min(1).max(2000),
}) {}
