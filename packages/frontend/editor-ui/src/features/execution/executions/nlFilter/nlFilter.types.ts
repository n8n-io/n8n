import { z } from 'zod';

/**
 * Strict schema describing what the AI is allowed to emit when
 * translating a natural-language query into an Executions filter.
 *
 * Keep this loose enough to forgive small AI quirks (extra whitespace,
 * missing optional fields), strict enough to reject hallucinated keys.
 */
export const NlExecutionFilterAiResponseSchema = z
	.object({
		status: z.enum(['all', 'success', 'error', 'running', 'waiting', 'canceled', 'new']).optional(),
		/** Workflow id (UUID-ish string). Used directly. */
		workflowId: z.string().min(1).optional(),
		/** Workflow display name. Resolved client-side against the user's workflows list. */
		workflowName: z.string().min(1).optional(),
		/** ISO 8601 datetime string. */
		startedAfter: z.string().min(1).optional(),
		/** ISO 8601 datetime string. */
		startedBefore: z.string().min(1).optional(),
	})
	.strict();

export type NlExecutionFilterAiResponse = z.infer<typeof NlExecutionFilterAiResponseSchema>;
