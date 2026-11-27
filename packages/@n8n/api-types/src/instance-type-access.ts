import type { INodeTypeDescription } from 'n8n-workflow';

import type { PolicyAction } from './dto/type-availability-policies/policy-rule.types';

/** One type's access under the instance policy alone, before any project composes with it. */
export type InstanceTypeAccess = {
	name: string;
	access: PolicyAction;
	/** `null` when the instance default action decided, not a rule. */
	matchedRuleId: string | null;
};

/**
 * The display data of a verified community node that is not installed. The instance has no
 * description of it, so this comes from the community node catalog.
 */
export type CommunityCatalogNode = Pick<
	INodeTypeDescription,
	'displayName' | 'icon' | 'iconUrl' | 'iconColor'
>;

export type UninstalledCommunityNodeAccess = InstanceTypeAccess & CommunityCatalogNode;

/**
 * Response of `GET /node-type-policies/instance/access` and
 * `GET /credential-type-policies/instance/access`. A write that sends this `version` back fails
 * if the policy changed since the read.
 */
export type InstanceTypeAccessResponse = {
	scopeId: string | null;
	version: number;
	defaultAction: PolicyAction;
	/** Installed types only. */
	types: InstanceTypeAccess[];
	/** Node types only. Empty while the community node catalog is off or not loaded. */
	uninstalledCommunityTypes?: UninstalledCommunityNodeAccess[];
};
