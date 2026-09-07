import { Z } from '@n8n/api-types';
import { z } from 'zod';

import { policyActionSchema, policyRuleListSchema } from './policy-rule.schema';

/** Request body for setting the composed instance policy. */
export class PutInstancePolicyDto extends Z.class({
	rules: policyRuleListSchema,
	defaultAction: policyActionSchema,
	// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
	version: z.number().int().nonnegative(),
}) {}
