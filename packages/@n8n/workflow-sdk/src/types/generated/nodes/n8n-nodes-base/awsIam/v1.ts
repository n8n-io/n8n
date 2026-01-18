/**
 * AWS IAM Node - Version 1
 * Interacts with Amazon IAM
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Add an existing user to a group */
export type AwsIamV1UserAddToGroupConfig = {
	resource: 'user';
	operation: 'addToGroup';
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

/** Create a new user */
export type AwsIamV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * The username of the new user to create
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		userName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a user */
export type AwsIamV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * Select the user you want to delete
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a user */
export type AwsIamV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Select the user you want to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of users */
export type AwsIamV1UserGetAllConfig = {
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
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @displayOptions.hide { returnAll: [true] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Remove a user from a group */
export type AwsIamV1UserRemoveFromGroupConfig = {
	resource: 'user';
	operation: 'removeFromGroup';
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

/** Update a user */
export type AwsIamV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * Select the user you want to update
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		user: ResourceLocatorValue;
/**
 * The new name of the user
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		userName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Create a new user */
export type AwsIamV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
/**
 * The name of the new group to create
 * @displayOptions.show { resource: ["group"], operation: ["create"] }
 */
		groupName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete a user */
export type AwsIamV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
/**
 * Select the group you want to delete
 * @displayOptions.show { resource: ["group"], operation: ["delete"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a user */
export type AwsIamV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
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

/** Retrieve a list of users */
export type AwsIamV1GroupGetAllConfig = {
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
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @displayOptions.hide { returnAll: [true] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to include a list of users in the group
 * @displayOptions.show { resource: ["group"], operation: ["getAll"] }
 * @default false
 */
		includeUsers?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Update a user */
export type AwsIamV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
/**
 * Select the group you want to update
 * @displayOptions.show { resource: ["group"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		group: ResourceLocatorValue;
/**
 * The new name of the group
 * @displayOptions.show { resource: ["group"], operation: ["update"] }
 */
		groupName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type AwsIamV1Params =
	| AwsIamV1UserAddToGroupConfig
	| AwsIamV1UserCreateConfig
	| AwsIamV1UserDeleteConfig
	| AwsIamV1UserGetConfig
	| AwsIamV1UserGetAllConfig
	| AwsIamV1UserRemoveFromGroupConfig
	| AwsIamV1UserUpdateConfig
	| AwsIamV1GroupCreateConfig
	| AwsIamV1GroupDeleteConfig
	| AwsIamV1GroupGetConfig
	| AwsIamV1GroupGetAllConfig
	| AwsIamV1GroupUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface AwsIamV1Credentials {
	aws: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type AwsIamV1Node = {
	type: 'n8n-nodes-base.awsIam';
	version: 1;
	config: NodeConfig<AwsIamV1Params>;
	credentials?: AwsIamV1Credentials;
};