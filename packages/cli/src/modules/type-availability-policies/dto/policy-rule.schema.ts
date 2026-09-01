import { z } from 'zod';

import { policySelectorSchema } from './policy-selector.schema';

/** Zod counterpart of `PolicyAction` in `../policy-rule.types.ts`. */
export const policyActionSchema = z.enum(['allow', 'deny', 'delegate']);

/** Zod counterpart of `PolicyRule` in `../policy-rule.types.ts`. */
export const policyRuleSchema = z.object({
	id: z.string().min(1),
	action: policyActionSchema,
	selector: policySelectorSchema,
});

export type PolicyRuleInput = z.infer<typeof policyRuleSchema>;

/** An ordered list of rules for one policy document. Rejects duplicate rule ids. */
export const policyRuleListSchema = z.array(policyRuleSchema).superRefine((rules, ctx) => {
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
});
