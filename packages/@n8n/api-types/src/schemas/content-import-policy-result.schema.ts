import { z } from 'zod';

import { policyCheckFailureSchema } from './policy-check-failure.schema';
import { policyViolationSchema } from './policy-violation.schema';

/**
 * Why the content-import policy blocked one artifact. The artifact was skipped; the rest of the
 * import/pull still lands. `checkErrors` stays empty here: under `enforce` a check that cannot
 * answer fails the whole import, so it never lands on a single artifact's result.
 */
export const contentImportPolicyResultSchema = z.object({
	violations: z.array(policyViolationSchema),
	checkErrors: z.array(policyCheckFailureSchema),
});

export type ContentImportPolicyResult = z.infer<typeof contentImportPolicyResultSchema>;
