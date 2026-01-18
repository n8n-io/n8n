/**
 * AWS Cognito Node Types
 *
 * Sends data to AWS Cognito
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/awscognito/
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

/** Create a new group */
export type AwsCognitoV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	/**
	 * Select the user pool to use
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * The name of the new group to create
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the group you want to delete
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the group you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	group: ResourceLocatorValue;
	/**
	 * Whether to include a list of users in the group
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	/**
	 * Whether to include a list of users in the group
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the group you want to update
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the user you want to add to the group
	 * @default {"mode":"list","value":""}
	 */
	user: ResourceLocatorValue;
	/**
	 * Select the group you want to add the user to
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Depending on the user pool settings, this parameter requires the username, the email, or the phone number. No whitespace is allowed.
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the user you want to delete
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the user you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	user: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit: number | Expression<number>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simple?: boolean | Expression<boolean>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Remove a user from a group */
export type AwsCognitoV1UserRemoveFromGroupConfig = {
	resource: 'user';
	operation: 'removeFromGroup';
	/**
	 * Select the user pool to use
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Select the user you want to remove from the group
	 * @default {"mode":"list","value":""}
	 */
	user: ResourceLocatorValue;
	/**
	 * Select the group you want to remove the user from
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
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	user: ResourceLocatorValue;
	/**
	 * Attributes to update for the user
	 * @default {"attributes":[]}
	 */
	userAttributes: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve details of an existing group */
export type AwsCognitoV1UserPoolGetConfig = {
	resource: 'userPool';
	operation: 'get';
	/**
	 * Select the user pool to retrieve
	 * @default {"mode":"list","value":""}
	 */
	userPool: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
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
	| AwsCognitoV1UserPoolGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsCognitoV1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsCognitoNode = {
	type: 'n8n-nodes-base.awsCognito';
	version: 1;
	config: NodeConfig<AwsCognitoV1Params>;
	credentials?: AwsCognitoV1Credentials;
};
