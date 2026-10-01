import { z } from 'zod';

import { policyRuleListSchema } from './policy-rule.schema';
import { Z } from '../../zod-class';

/** Request body for replacing a policy document's rules. */
export class UpdatePolicyDocumentDto extends Z.class({
	rules: policyRuleListSchema,
	// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
	version: z.number().int().nonnegative(),
}) {}
