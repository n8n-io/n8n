/**
 * AWS Cognito Node - Version 1
 * Sends data to AWS Cognito
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new group */
export type AwsCognitoV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * The name of the new group to create
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
 */
		newGroupName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an existing group */
export type AwsCognitoV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["group"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the group you want to delete
 * @displayOptions.show { resource: ["group"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve details of an existing group */
export type AwsCognitoV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["group"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the group you want to retrieve
 * @displayOptions.show { resource: ["group"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
/**
 * Whether to include a list of users in the group
 * @displayOptions.show { resource: ["group"], operation: ["get"] }
 * @default false
 */
		includeUsers?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of groups */
export type AwsCognitoV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["group"], operation: ["getAll"] }
 * @default 50
 */
		limit: number | Expression<number>;
/**
 * Whether to include a list of users in the group
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default false
 */
		includeUsers?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Update an existing group */
export type AwsCognitoV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["group"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the group you want to update
 * @displayOptions.show { resource: ["group"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Add an existing user to a group */
export type AwsCognitoV1UserAddToGroupConfig = {
	resource: 'user';
	operation: 'addToGroup';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["user"], operation: ["addToGroup"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the user you want to add to the group
 * @displayOptions.show { resource: ["user"], operation: ["addToGroup"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
/**
 * Select the group you want to add the user to
 * @displayOptions.show { resource: ["user"], operation: ["addToGroup"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Create a new group */
export type AwsCognitoV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * Select the user pool to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Depending on the user pool settings, this parameter requires the username, the email, or the phone number. No whitespace is allowed.
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		newUserName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an existing group */
export type AwsCognitoV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the user you want to delete
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve details of an existing group */
export type AwsCognitoV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the user you want to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of groups */
export type AwsCognitoV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["user"], operation: ["getAll"] }
 * @default 50
 */
		limit: number | Expression<number>;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	filters?: {
		filter?: {
			/** The attribute to search for
			 * @default email
			 */
			attribute?: 'cognito:user_status' | 'email' | 'family_name' | 'given_name' | 'name' | 'phone_number' | 'preferred_username' | 'status' | 'sub' | 'username' | Expression<string>;
			/** The value of the attribute to search for
			 */
			value?: string | Expression<string>;
		};
	};
	requestOptions?: Record<string, unknown>;
};

/** Remove a user from a group */
export type AwsCognitoV1UserRemoveFromGroupConfig = {
	resource: 'user';
	operation: 'removeFromGroup';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["user"], operation: ["removeFromGroup"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Select the user you want to remove from the group
 * @displayOptions.show { resource: ["user"], operation: ["removeFromGroup"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
/**
 * Select the group you want to remove the user from
 * @displayOptions.show { resource: ["user"], operation: ["removeFromGroup"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Update an existing group */
export type AwsCognitoV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * Select the user pool to use
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
	user: ResourceLocatorValue;
/**
 * Attributes to update for the user
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 * @default {"attributes":[]}
 */
		userAttributes: {
		attributes?: Array<{
			/** Attribute Type
			 * @default standard
			 */
			attributeType?: 'standard' | 'custom' | Expression<string>;
			/** Standard Attribute
			 * @displayOptions.show { attributeType: ["standard"] }
			 * @default address
			 */
			standardName?: 'address' | 'birthdate' | 'email' | 'family_name' | 'gender' | 'given_name' | 'locale' | 'middle_name' | 'name' | 'nickname' | 'phone_number' | 'preferred_username' | 'profilepicture' | 'updated_at' | 'sub' | 'website' | 'zoneinfo' | Expression<string>;
			/** The name of the custom attribute (must start with "custom:")
			 * @displayOptions.show { attributeType: ["custom"] }
			 */
			customName?: string | Expression<string>;
			/** The value of the attribute
			 */
			value?: string | Expression<string>;
		}>;
	};
	requestOptions?: Record<string, unknown>;
};

/** Retrieve details of an existing group */
export type AwsCognitoV1UserPoolGetConfig = {
	resource: 'userPool';
	operation: 'get';
/**
 * Select the user pool to retrieve
 * @displayOptions.show { resource: ["userPool"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		userPool: ResourceLocatorValue;
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["userPool"], operation: ["get"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

export type AwsCognitoV1Params =
	| AwsCognitoV1GroupCreateConfig
	| AwsCognitoV1GroupDeleteConfig
	| AwsCognitoV1GroupGetConfig
	| AwsCognitoV1GroupGetAllConfig
	| AwsCognitoV1GroupUpdateConfig
	| AwsCognitoV1UserAddToGroupConfig
	| AwsCognitoV1UserCreateConfig
	| AwsCognitoV1UserDeleteConfig
	| AwsCognitoV1UserGetConfig
	| AwsCognitoV1UserGetAllConfig
	| AwsCognitoV1UserRemoveFromGroupConfig
	| AwsCognitoV1UserUpdateConfig
	| AwsCognitoV1UserPoolGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsCognitoV1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AwsCognitoV1NodeBase {
	type: 'n8n-nodes-base.awsCognito';
	version: 1;
	credentials?: AwsCognitoV1Credentials;
}

export type AwsCognitoV1GroupCreateNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1GroupCreateConfig>;
};

export type AwsCognitoV1GroupDeleteNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1GroupDeleteConfig>;
};

export type AwsCognitoV1GroupGetNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1GroupGetConfig>;
};

export type AwsCognitoV1GroupGetAllNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1GroupGetAllConfig>;
};

export type AwsCognitoV1GroupUpdateNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1GroupUpdateConfig>;
};

export type AwsCognitoV1UserAddToGroupNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserAddToGroupConfig>;
};

export type AwsCognitoV1UserCreateNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserCreateConfig>;
};

export type AwsCognitoV1UserDeleteNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserDeleteConfig>;
};

export type AwsCognitoV1UserGetNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserGetConfig>;
};

export type AwsCognitoV1UserGetAllNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserGetAllConfig>;
};

export type AwsCognitoV1UserRemoveFromGroupNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserRemoveFromGroupConfig>;
};

export type AwsCognitoV1UserUpdateNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserUpdateConfig>;
};

export type AwsCognitoV1UserPoolGetNode = AwsCognitoV1NodeBase & {
	config: NodeConfig<AwsCognitoV1UserPoolGetConfig>;
};

export type AwsCognitoV1Node =
	| AwsCognitoV1GroupCreateNode
	| AwsCognitoV1GroupDeleteNode
	| AwsCognitoV1GroupGetNode
	| AwsCognitoV1GroupGetAllNode
	| AwsCognitoV1GroupUpdateNode
	| AwsCognitoV1UserAddToGroupNode
	| AwsCognitoV1UserCreateNode
	| AwsCognitoV1UserDeleteNode
	| AwsCognitoV1UserGetNode
	| AwsCognitoV1UserGetAllNode
	| AwsCognitoV1UserRemoveFromGroupNode
	| AwsCognitoV1UserUpdateNode
	| AwsCognitoV1UserPoolGetNode
	;