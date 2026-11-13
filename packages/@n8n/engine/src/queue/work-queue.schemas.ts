import { z } from 'zod';

const id = z.string().min(1);

/**
 * Parses an `OrchestrationMessage` that came from outside the process. Not
 * `strict`: a consumer drops a field it does not know, so a newer publisher
 * can add one.
 */
export const orchestrationMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('execution:enqueued'), executionId: id }),
	z.object({ type: z.literal('step:settled'), executionId: id, stepId: id }),
]);

/** Parses a `StepMessage` that came from outside the process. */
export const stepMessageSchema = z.object({
	type: z.literal('step:ready'),
	executionId: id,
	stepId: id,
});
