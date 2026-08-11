import { z } from 'zod';

/**
 * Shared resume envelope for plain-approval HITL tools.
 *
 * Matches the `approval` arm of `InstanceAiConfirmRequestDto` and the
 * corresponding fields on `ConfirmationData` that `resumeSuspendedRun`
 * forwards. Tools that only need `approved` still declare these optional
 * keys so checkpointed JSON Schema (`additionalProperties: false`) accepts
 * approve-with-comment / allow-always without relying on stripUnknown.
 */
export const standardApprovalResumeSchema = z.object({
	approved: z.boolean(),
	userInput: z.string().optional(),
	scope: z.enum(['once', 'session']).optional(),
});

export type StandardApprovalResumeData = z.infer<typeof standardApprovalResumeSchema>;
