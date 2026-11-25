import { z } from 'zod';

/**
 * Continuation that a configured review stores on a suspended tool call.
 * Keep this module light: the runtime reads it on every workflow run.
 */
export const DECISION_CONTINUATION_SCHEMA = z.object({
	__agentDecisionWorkflow: z.literal(true),
	executionId: z.string(),
	definitionHash: z.string(),
	workflowVersionId: z.string().optional(),
	reviewIndex: z.number().int().min(0).default(0),
	toolSuspended: z.boolean().optional(),
	toolContinuation: z.string().optional(),
});
