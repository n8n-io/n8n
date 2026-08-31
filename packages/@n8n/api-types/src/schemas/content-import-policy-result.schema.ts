import { z } from 'zod';

import { policyCheckFailureSchema } from './policy-check-failure.schema';
import { policyViolationSchema } from './policy-violation.schema';

/**
 * The content-import policy's advisory result for one artifact — never blocks the import/pull,
 * per contentImport being `evaluate`, not `enforce`. Bundled as one object (rather than two
 * sibling fields) because both come from the same evaluation and are read together: a check
 * that failed to run means a violation may have gone undetected.
 */
export const contentImportPolicyResultSchema = z.object({
	violations: z.array(policyViolationSchema),
	checkErrors: z.array(policyCheckFailureSchema),
});

export type ContentImportPolicyResult = z.infer<typeof contentImportPolicyResultSchema>;
