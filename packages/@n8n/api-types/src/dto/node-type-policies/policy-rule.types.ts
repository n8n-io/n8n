/**
 * Domain types for node type availability policies, shared by the internal and public API
 * request DTOs and by the backend evaluator.
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

/**
 * The actions a project scope accepts. `delegate` defers to a narrower scope, and none exists
 * below project, so project-scope writes never accept it.
 */
export type NonDelegatingPolicyAction = Exclude<PolicyAction, 'delegate'>;

/** A `PolicyRule` as a project scope accepts it. */
export type NonDelegatingPolicyRule = Omit<PolicyRule, 'action'> & {
	readonly action: NonDelegatingPolicyAction;
};
