/**
 * Microsoft Entra ID Node - Version 1
 * Interact with Microsoft Entra ID API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
 */
		displayName: string | Expression<string>;
/**
 * The mail alias for the group. Only enter the local-part without the domain.
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
 */
		mailNickname: string | Expression<string>;
/**
 * Whether the group is mail-enabled
 * @displayOptions.show { resource: ["group"], operation: ["create"], groupType: ["Unified"] }
 * @default false
 */
		mailEnabled: boolean | Expression<boolean>;
	membershipType?: '' | 'DynamicMembership' | Expression<string>;
/**
 * Whether the group is a security group
 * @displayOptions.show { resource: ["group"], operation: ["create"], groupType: ["Unified"] }
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
 * @displayOptions.show { resource: ["group"], operation: ["get"], output: ["fields"] }
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
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["group"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * &lt;a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter"&gt;Query parameter&lt;/a&gt; to filter results by
 * @hint If empty, all the groups will be returned
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 */
		filter?: string | Expression<string>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { resource: ["group"], operation: ["getAll"], output: ["fields"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 * @default true
 */
		accountEnabled: boolean | Expression<boolean>;
/**
 * The name to display in the address book for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		displayName: string | Expression<string>;
/**
 * The user principal name (UPN)
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		userPrincipalName: string | Expression<string>;
/**
 * The mail alias for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		mailNickname: string | Expression<string>;
/**
 * The password for the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["get"], output: ["fields"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
/**
 * &lt;a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter"&gt;Query parameter&lt;/a&gt; to filter results by
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 */
		filter?: string | Expression<string>;
	output?: 'simple' | 'raw' | 'fields' | Expression<string>;
/**
 * The fields to add to the output
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], output: ["fields"] }
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
	| MicrosoftEntraV1UserUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftEntraV1Credentials {
	microsoftEntraOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftEntraV1NodeBase {
	type: 'n8n-nodes-base.microsoftEntra';
	version: 1;
	credentials?: MicrosoftEntraV1Credentials;
}

export type MicrosoftEntraV1GroupCreateNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1GroupCreateConfig>;
};

export type MicrosoftEntraV1GroupDeleteNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1GroupDeleteConfig>;
};

export type MicrosoftEntraV1GroupGetNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1GroupGetConfig>;
};

export type MicrosoftEntraV1GroupGetAllNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1GroupGetAllConfig>;
};

export type MicrosoftEntraV1GroupUpdateNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1GroupUpdateConfig>;
};

export type MicrosoftEntraV1UserAddGroupNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserAddGroupConfig>;
};

export type MicrosoftEntraV1UserCreateNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserCreateConfig>;
};

export type MicrosoftEntraV1UserDeleteNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserDeleteConfig>;
};

export type MicrosoftEntraV1UserGetNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserGetConfig>;
};

export type MicrosoftEntraV1UserGetAllNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserGetAllConfig>;
};

export type MicrosoftEntraV1UserRemoveGroupNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserRemoveGroupConfig>;
};

export type MicrosoftEntraV1UserUpdateNode = MicrosoftEntraV1NodeBase & {
	config: NodeConfig<MicrosoftEntraV1UserUpdateConfig>;
};

export type MicrosoftEntraV1Node =
	| MicrosoftEntraV1GroupCreateNode
	| MicrosoftEntraV1GroupDeleteNode
	| MicrosoftEntraV1GroupGetNode
	| MicrosoftEntraV1GroupGetAllNode
	| MicrosoftEntraV1GroupUpdateNode
	| MicrosoftEntraV1UserAddGroupNode
	| MicrosoftEntraV1UserCreateNode
	| MicrosoftEntraV1UserDeleteNode
	| MicrosoftEntraV1UserGetNode
	| MicrosoftEntraV1UserGetAllNode
	| MicrosoftEntraV1UserRemoveGroupNode
	| MicrosoftEntraV1UserUpdateNode
	;