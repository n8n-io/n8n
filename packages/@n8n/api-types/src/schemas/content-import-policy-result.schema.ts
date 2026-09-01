import { z } from 'zod';

import { policyCheckFailureSchema } from './policy-check-failure.schema';
import { policyViolationSchema } from './policy-violation.schema';

/**
 * Why the content-import policy blocked one artifact. The artifact was skipped; the rest of the
 * import/pull still lands. Bundled as one object (rather than two sibling fields) because both
 * come from the same decision and are read together: a check that failed to run means a
 * violation may have gone undetected.
 */
export const contentImportPolicyResultSchema = z.object({
	violations: z.array(policyViolationSchema),
	checkErrors: z.array(policyCheckFailureSchema),
});

export type ContentImportPolicyResult = z.infer<typeof contentImportPolicyResultSchema>;
