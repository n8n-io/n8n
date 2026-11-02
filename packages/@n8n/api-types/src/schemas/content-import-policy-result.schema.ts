import { z } from 'zod';

import { policyCheckFailureSchema } from './policy-check-failure.schema';
import { policyViolationSchema } from './policy-violation.schema';

/**
 * Why the content-import policy blocks one artifact; the rest of the import still lands.
 * `checkErrors` is empty on an import result, because a broken check fails the whole import.
 * A pull preview only evaluates, so there it can list the checks that could not answer.
 */
export const contentImportPolicyResultSchema = z.object({
	violations: z.array(policyViolationSchema),
	checkErrors: z.array(policyCheckFailureSchema),
});

export type ContentImportPolicyResult = z.infer<typeof contentImportPolicyResultSchema>;
