/**
 * Domain types for node type availability policies.
 *
 * Deliberately independent of the `policy`/`policy_scope`/`policy_attachment` TypeORM
 * entities (not yet built) — the repository layer will map DB rows into these shapes so
 * the evaluator never depends on the persistence layer.
 */

/** Matches a node type by its exact full name, or by its package segment. */
export type PolicySelector =
	| { readonly kind: 'name'; readonly value: string }
	| { readonly kind: 'package'; readonly value: string };

export type PolicyAction = 'allow' | 'deny' | 'delegate';

/** One first-match rule within a policy document, in document order. */
export type PolicyRule = {
	readonly id: string;
	readonly action: PolicyAction;
	readonly selector: PolicySelector;
};

/** One policy document as attached to a scope, with its evaluation-order metadata. */
export type PolicyAttachment = {
	readonly policyId: string;
	readonly rules: readonly PolicyRule[];
	readonly priority: number;
	readonly isFloor: boolean;
};

/**
 * What one scope's evaluation decides for one type.
 *
 * `matchedRuleId: null` means the scope's `defaultAction` decided, not an explicit rule —
 * that distinction matters to callers composing across scopes, where only an explicit
 * `allow` (non-null `matchedRuleId`) can satisfy a `delegate`.
 */
export type PolicyVerdict = {
	readonly action: PolicyAction;
	readonly matchedRuleId: string | null;
};
