import { z } from 'zod';

/**
 * Frontend-only discriminator for generic approval cards.
 *
 * Approval suspensions keep the underlying tool name on the wire, so the FE
 * maps them to this value before dispatching to the approval card component.
 */
export const APPROVAL_TOOL_NAME = 'approval' as const;

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export const cancellationResumeSchema = z.object({
	_type: z.literal('agent.cancellation'),
	message: z.string().min(1),
});

export type CancellationResumeData = z.infer<typeof cancellationResumeSchema>;
