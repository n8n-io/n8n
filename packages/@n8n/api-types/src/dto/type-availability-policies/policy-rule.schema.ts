import { z } from 'zod';

import type {
	NodeTypePolicyRule,
	NonDelegatingPolicyAction,
	NonDelegatingPolicyRule,
	PolicyAction,
	PolicyRule,
} from './policy-rule.types';
import {
	credentialTypePolicySelectorSchema,
	nodeTypePolicySelectorSchema,
} from './policy-selector.schema';

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
 * `delegate` is only meaningful where a narrower scope exists to opt in — instance scope
 * today. There is no scope narrower than project, so a project-scope write rejects it outright.
 */
export const nonDelegatingPolicyActionSchema = policyActionSchema.exclude([
	'delegate',
]) satisfies z.ZodType<NonDelegatingPolicyAction>;

function rejectDuplicateRuleIds(rules: ReadonlyArray<{ id: string }>, ctx: z.RefinementCtx): void {
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

/**
 * One rule, an ordered rule list, and the project-scope list that also rejects `delegate`, for
 * one kind's selectors. Both lists reject duplicate rule ids.
 */
function ruleSchemasFor<Selector extends z.ZodTypeAny>(selector: Selector) {
	const rule = z.object({ id: z.string().min(1), action: policyActionSchema, selector });
	const nonDelegatingRule = rule.extend({ action: nonDelegatingPolicyActionSchema });

	return {
		rule,
		ruleList: z.array(rule).superRefine(rejectDuplicateRuleIds),
		nonDelegatingRuleList: z.array(nonDelegatingRule).superRefine(rejectDuplicateRuleIds),
	};
}

/** What one kind's rule schemas must parse into. `satisfies` keeps each kind honest against it. */
type RuleSchemas<Rule, NonDelegatingRule> = {
	rule: z.ZodType<Rule>;
	ruleList: z.ZodType<Rule[]>;
	nonDelegatingRuleList: z.ZodType<NonDelegatingRule[]>;
};

export const nodeTypePolicyRuleSchemas = ruleSchemasFor(
	nodeTypePolicySelectorSchema,
) satisfies RuleSchemas<
	NodeTypePolicyRule,
	NodeTypePolicyRule & { readonly action: NonDelegatingPolicyAction }
>;

export const credentialTypePolicyRuleSchemas = ruleSchemasFor(
	credentialTypePolicySelectorSchema,
) satisfies RuleSchemas<PolicyRule, NonDelegatingPolicyRule>;
