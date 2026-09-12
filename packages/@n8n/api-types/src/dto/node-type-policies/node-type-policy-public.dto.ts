import { z } from 'zod';

import { policyActionSchema, policyRuleSchema } from './policy-rule.schema';
import { Z } from '../../zod-class';

/**
 * Response shapes for the public node type policy routes. Request bodies reuse the internal
 * DTOs (`PutInstancePolicyDto`, `PutProjectPolicyDto`, …) so validation is identical on both
 * surfaces; only the responses need a public allowlist.
 */

/** A rule that never matches because an earlier rule in the same list already covers it. */
const shadowWarningSchema = z.object({
	ruleId: z.string(),
	shadowedByRuleId: z.string(),
});

/** Plain array on purpose: the response never re-runs the duplicate-id refinement. */
const policyRulesSchema = z.array(policyRuleSchema);

const effectivePolicySchema = z.object({
	// `null` until the scope is first written; the scope then reports `version: 0`.
	scopeId: z.string().nullable(),
	rules: policyRulesSchema,
	defaultAction: policyActionSchema,
	version: z.number().int().nonnegative(),
});

/** `GET` of a scope's composed policy. */
export class NodeTypePolicyEffectivePublicDto extends Z.class(effectivePolicySchema.shape) {}

/** `PUT` of a scope's composed policy: the new state plus shadowing warnings. */
export class NodeTypePolicyEffectiveWriteResultPublicDto extends Z.class({
	...effectivePolicySchema.shape,
	warnings: z.array(shadowWarningSchema),
}) {}
