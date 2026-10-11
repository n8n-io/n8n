import { z } from 'zod';

import { policyActionSchema, policyRuleListSchema } from './policy-rule.schema';
import { Z } from '../../zod-class';

/** Request body for setting the composed instance policy. */
export class PutInstancePolicyDto extends Z.class({
	rules: policyRuleListSchema,
	defaultAction: policyActionSchema,
	// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
	version: z.number().int().nonnegative(),
}) {}
