/**
 * Microsoft Entra ID Node Types
 *
 * Interact with Microsoft Entra ID API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftentra/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a group */
export type MicrosoftEntraV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	groupType?: 'Unified' | '' | Expression<string>;
	/**
	 * The name to display in the address book for the group
	 */
	displayName: string | Expression<string>;
	/**
	 * The mail alias for the group. Only enter the local-part without the domain.
	 */
	mailNickname: string | Expression<string>;
	/**
	 * Whether the group is mail-enabled
	 * @default false
	 */
	mailEnabled: boolean | Expression<boolean>;
	membershipType?: '' | 'DynamicMembership' | Expression<string>;
	/**
	 * Whether the group is a security group
	 * @default true
	 */
	securityEnabled?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a group */
export type MicrosoftEntraV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
	group: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve data for a specific group */
export type MicrosoftEntraV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
	group: ResourceLocatorValue;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: string[];
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of groups */
export type MicrosoftEntraV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * &lt;a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter"&gt;Query parameter&lt;/a&gt; to filter results by
	 */
	filter?: string | Expression<string>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: string[];
	requestOptions?: Record<string, unknown>;
};

/** Update a group */
export type MicrosoftEntraV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
	group: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Add user to group */
export type MicrosoftEntraV1UserAddGroupConfig = {
	resource: 'user';
	operation: 'addGroup';
	group: ResourceLocatorValue;
	user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Create a group */
export type MicrosoftEntraV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * Whether the account is enabled
	 * @default true
	 */
	accountEnabled: boolean | Expression<boolean>;
	/**
	 * The name to display in the address book for the user
	 */
	displayName: string | Expression<string>;
	/**
	 * The user principal name (UPN)
	 */
	userPrincipalName: string | Expression<string>;
	/**
	 * The mail alias for the user
	 */
	mailNickname: string | Expression<string>;
	/**
	 * The password for the user
	 */
	password: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a group */
export type MicrosoftEntraV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve data for a specific group */
export type MicrosoftEntraV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	user: ResourceLocatorValue;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: string[];
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of groups */
export type MicrosoftEntraV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	/**
	 * &lt;a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter"&gt;Query parameter&lt;/a&gt; to filter results by
	 */
	filter?: string | Expression<string>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
	/**
	 * The fields to add to the output
	 * @default []
	 */
	fields?: string[];
	requestOptions?: Record<string, unknown>;
};

/** Remove user from group */
export type MicrosoftEntraV1UserRemoveGroupConfig = {
	resource: 'user';
	operation: 'removeGroup';
	group: ResourceLocatorValue;
	user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Update a group */
export type MicrosoftEntraV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	user: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type MicrosoftEntraV1Params =
	| MicrosoftEntraV1GroupCreateConfig
	| MicrosoftEntraV1GroupDeleteConfig
	| MicrosoftEntraV1GroupGetConfig
	| MicrosoftEntraV1GroupGetAllConfig
	| MicrosoftEntraV1GroupUpdateConfig
	| MicrosoftEntraV1UserAddGroupConfig
	| MicrosoftEntraV1UserCreateConfig
	| MicrosoftEntraV1UserDeleteConfig
	| MicrosoftEntraV1UserGetConfig
	| MicrosoftEntraV1UserGetAllConfig
	| MicrosoftEntraV1UserRemoveGroupConfig
	| MicrosoftEntraV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftEntraV1Credentials {
	microsoftEntraOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftEntraV1Node = {
	type: 'n8n-nodes-base.microsoftEntra';
	version: 1;
	config: NodeConfig<MicrosoftEntraV1Params>;
	credentials?: MicrosoftEntraV1Credentials;
};

export type MicrosoftEntraNode = MicrosoftEntraV1Node;
