import { z } from 'zod';

/**
 * A policy check that failed to run. Deliberately vague — error details stay server-side.
 *
 * Lands here (instead of aborting the whole evaluation) so one broken check doesn't sink a
 * whole report — a crash never looks like "nothing to report".
 */
export const policyCheckFailureSchema = z.object({
	checkId: z.string(),
	correlationId: z.string(),
});

export type PolicyCheckFailure = z.infer<typeof policyCheckFailureSchema>;
