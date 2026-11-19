import type { PolicyAction } from './dto/type-availability-policies/policy-rule.types';

/** One type's access under the instance policy alone, before any project composes with it. */
export type InstanceTypeAccess = {
	name: string;
	access: PolicyAction;
	/** `null` when the instance default action decided, not a rule. */
	matchedRuleId: string | null;
};

/**
 * Response of `GET /node-type-policies/instance/access` and
 * `GET /credential-type-policies/instance/access`. A write that sends this `version` back fails
 * if the policy changed since the read.
 */
export type InstanceTypeAccessResponse = {
	scopeId: string | null;
	version: number;
	defaultAction: PolicyAction;
	types: InstanceTypeAccess[];
};
