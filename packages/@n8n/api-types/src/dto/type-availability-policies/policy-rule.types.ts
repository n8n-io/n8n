/**
 * Domain types for type availability policies, shared by the internal and public API
 * request DTOs and by the backend evaluator.
 */

/**
 * Matches a type by its exact full name, or by its package segment. `extends` is for credential
 * types only: it matches the named type and every type built on it through `extends`.
 */
export type PolicySelector =
	| { readonly kind: 'name'; readonly value: string }
	| { readonly kind: 'package'; readonly value: string }
	| { readonly kind: 'extends'; readonly value: string };

/** The selectors a node type policy accepts. */
export type NodeTypePolicySelector = Exclude<PolicySelector, { readonly kind: 'extends' }>;

export type PolicyAction = 'allow' | 'deny' | 'delegate';

/** One first-match rule within a policy document, in document order. */
export type PolicyRule = {
	readonly id: string;
	readonly action: PolicyAction;
	readonly selector: PolicySelector;
};

/** A `PolicyRule` as a node type policy accepts it. */
export type NodeTypePolicyRule = Omit<PolicyRule, 'selector'> & {
	readonly selector: NodeTypePolicySelector;
};

export function isNodeTypePolicyRule(rule: PolicyRule): rule is NodeTypePolicyRule {
	return rule.selector.kind !== 'extends';
}

/**
 * The actions a project scope accepts. `delegate` defers to a narrower scope, and none exists
 * below project, so project-scope writes never accept it.
 */
export type NonDelegatingPolicyAction = Exclude<PolicyAction, 'delegate'>;

/** A `PolicyRule` as a project scope accepts it. */
export type NonDelegatingPolicyRule = Omit<PolicyRule, 'action'> & {
	readonly action: NonDelegatingPolicyAction;
};
