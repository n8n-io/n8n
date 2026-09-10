import { Z } from '@n8n/api-types';
import { z } from 'zod';

import {
	nonDelegatingPolicyActionSchema,
	nonDelegatingPolicyRuleListSchema,
} from './policy-rule.schema';

/**
 * Request body for setting a project's composed policy. Same shape as
 * `PutInstancePolicyDto`, except `delegate` is rejected — there is no scope narrower than
 * project for it to defer to.
 */
export class PutProjectPolicyDto extends Z.class({
	rules: nonDelegatingPolicyRuleListSchema,
	defaultAction: nonDelegatingPolicyActionSchema,
	// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
	version: z.number().int().nonnegative(),
}) {}
