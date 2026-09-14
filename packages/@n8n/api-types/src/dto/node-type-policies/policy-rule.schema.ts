import { z } from 'zod';

import type {
	NonDelegatingPolicyAction,
	NonDelegatingPolicyRule,
	PolicyAction,
	PolicyRule,
} from './policy-rule.types';
import { policySelectorSchema } from './policy-selector.schema';

/**
 * Zod counterpart of `PolicyAction` in `./policy-rule.types.ts`. The `satisfies` check
 * keeps this schema honest against that type.
 */
export const policyActionSchema = z.enum([
	'allow',
	'deny',
	'delegate',
]) satisfies z.ZodType<PolicyAction>;

/**
 * Zod counterpart of `PolicyRule` in `./policy-rule.types.ts`. The `satisfies` check
 * keeps this schema honest against that type.
 */
export const policyRuleSchema = z.object({
	id: z.string().min(1),
	action: policyActionSchema,
	selector: policySelectorSchema,
}) satisfies z.ZodType<PolicyRule>;

function rejectDuplicateRuleIds(rules: PolicyRule[], ctx: z.RefinementCtx): void {
	const seenIds = new Set<string>();

	for (const [index, rule] of rules.entries()) {
		if (seenIds.has(rule.id)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate rule id: ${rule.id}`,
				path: [index, 'id'],
			});
			continue;
		}

		seenIds.add(rule.id);
	}
}

/** An ordered list of rules for one policy document. Rejects duplicate rule ids. */
export const policyRuleListSchema = z.array(policyRuleSchema).superRefine(rejectDuplicateRuleIds);

/**
 * `delegate` is only meaningful where a narrower scope exists to opt in — instance scope
 * today. There is no scope narrower than project, so a project-scope write rejects it outright.
 */
export const nonDelegatingPolicyActionSchema = policyActionSchema.exclude([
	'delegate',
]) satisfies z.ZodType<NonDelegatingPolicyAction>;

const nonDelegatingPolicyRuleSchema = policyRuleSchema.extend({
	action: nonDelegatingPolicyActionSchema,
}) satisfies z.ZodType<NonDelegatingPolicyRule>;

/** Same as `policyRuleListSchema`, but for project scope: rejects a `delegate` rule too. */
export const nonDelegatingPolicyRuleListSchema = z
	.array(nonDelegatingPolicyRuleSchema)
	.superRefine(rejectDuplicateRuleIds);
