import { z } from 'zod';

/**
 * One reason something was blocked by a policy check.
 *
 * The same shape is used by the UI, API errors, import reports and the audit log.
 * `kind`, `subjectType` and `scope` are plain strings rather than enums, so later policy
 * features can add values without breaking existing readers — which also means readers
 * must cope with values they don't recognise.
 */
export const policyViolationSchema = z.object({
	/** e.g. `'node-type-unavailable'`. Don't assume you know every value. */
	kind: z.string(),

	/** Id of the check that objected. */
	checkId: z.string(),

	/** Readable on its own. Don't parse details out of it — use the fields below. */
	message: z.string(),

	/** What was blocked: a node type name, a credential type name, … */
	subject: z.string().optional(),

	/** What kind of name `subject` is — node and credential type names can look alike. */
	subjectType: z.string().optional(),

	/** Which level objected. Usually `'instance'` or `'project'`, but treat it as open. */
	scope: z.string().optional(),

	/** The rule that decided, if a rule did rather than a fallback default. */
	matchedRuleId: z.string().optional(),
});

export type PolicyViolation = z.infer<typeof policyViolationSchema>;
