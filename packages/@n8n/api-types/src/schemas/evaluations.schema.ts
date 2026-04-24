import { z } from 'zod';

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

// concurrency is clamped 1–10 server-side in Phase 2; when omitted or when the
// feature flag is off, the runner falls back to sequential execution.
export const startTestRunPayloadSchema = z.object({
	concurrency: z.number().int().min(1).max(10).optional(),
});
export type StartTestRunPayload = z.infer<typeof startTestRunPayloadSchema>;
