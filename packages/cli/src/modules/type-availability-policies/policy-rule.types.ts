/**
 * Domain types for node type availability policies.
 *
 * The rule/selector/action shapes live in `@n8n/api-types` so the public and internal request
 * DTOs share them; they are re-exported here so the module keeps one import path. The types
 * below are backend-only.
 *
 * Deliberately independent of the `policy`/`policy_scope`/`policy_attachment` TypeORM
 * entities — the repository layer maps DB rows into these shapes so the evaluator never
 * depends on the persistence layer.
 */

import type { PolicyAction, PolicyRule } from '@n8n/api-types';

export type {
	NonDelegatingPolicyAction,
	NonDelegatingPolicyRule,
	PolicyAction,
	PolicyRule,
	PolicySelector,
} from '@n8n/api-types';

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
