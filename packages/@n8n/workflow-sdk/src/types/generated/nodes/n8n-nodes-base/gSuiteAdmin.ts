/**
 * Google Workspace Admin Node Types
 *
 * Consume Google Workspace Admin API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/gsuiteadmin/
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

/** Get a ChromeOS device */
export type GSuiteAdminV1DeviceGetConfig = {
	resource: 'device';
	operation: 'get';
	/**
	 * Select the device you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	deviceId: ResourceLocatorValue;
	/**
	 * What subset of fields to fetch for this device
	 * @default basic
	 */
	projection: 'basic' | 'full' | Expression<string>;
};

/** Get many ChromeOS devices */
export type GSuiteAdminV1DeviceGetAllConfig = {
	resource: 'device';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * What subset of fields to fetch for this device
	 * @default basic
	 */
	projection: 'basic' | 'full' | Expression<string>;
	/**
	 * Whether to include devices from organizational units below your specified organizational unit
	 * @default false
	 */
	includeChildOrgunits?: boolean | Expression<boolean>;
	filter?: Record<string, unknown>;
	/**
	 * Define sorting rules for the results
	 * @default {}
	 */
	sort?: Record<string, unknown>;
};

/** Update a ChromeOS device */
export type GSuiteAdminV1DeviceUpdateConfig = {
	resource: 'device';
	operation: 'update';
	/**
	 * Select the device you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	deviceId: ResourceLocatorValue;
	updateOptions?: Record<string, unknown>;
};

/** Change the status of a ChromeOS device */
export type GSuiteAdminV1DeviceChangeStatusConfig = {
	resource: 'device';
	operation: 'changeStatus';
	/**
	 * Select the device you want to retrieve
	 * @default {"mode":"list","value":""}
	 */
	deviceId: ResourceLocatorValue;
	/**
	 * Set the status of a device
	 * @default reenable
	 */
	action: 'reenable' | 'disable' | Expression<string>;
};

/** Create a group */
export type GSuiteAdminV1GroupCreateConfig = {
	resource: 'group';
	operation: 'create';
	/**
	 * The group's display name
	 */
	name?: string | Expression<string>;
	/**
	 * The group's email address. If your account has multiple domains, select the appropriate domain for the email address. The email must be unique
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type GSuiteAdminV1GroupDeleteConfig = {
	resource: 'group';
	operation: 'delete';
	/**
	 * Select the group to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	groupId: ResourceLocatorValue;
};

/** Get a ChromeOS device */
export type GSuiteAdminV1GroupGetConfig = {
	resource: 'group';
	operation: 'get';
	/**
	 * Select the group to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	groupId: ResourceLocatorValue;
};

/** Get many ChromeOS devices */
export type GSuiteAdminV1GroupGetAllConfig = {
	resource: 'group';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filter?: Record<string, unknown>;
	sort?: Record<string, unknown>;
};

/** Update a ChromeOS device */
export type GSuiteAdminV1GroupUpdateConfig = {
	resource: 'group';
	operation: 'update';
	/**
	 * Select the group to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	groupId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Add an existing user to a group */
export type GSuiteAdminV1UserAddToGroupConfig = {
	resource: 'user';
	operation: 'addToGroup';
	/**
	 * Select the user to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	/**
	 * Select the group to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	groupId: ResourceLocatorValue;
};

/** Create a group */
export type GSuiteAdminV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	firstName: string | Expression<string>;
	lastName: string | Expression<string>;
	/**
	 * Stores the password for the user account. A minimum of 8 characters is required. The maximum length is 100 characters.
	 */
	password: string | Expression<string>;
	/**
	 * The username that will be set to the user. Example: If you domain is example.com and you set the username to n.smith then the user's final email address will be n.smith@example.com.
	 */
	username?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	domain: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a group */
export type GSuiteAdminV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * Select the user to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
};

/** Get a ChromeOS device */
export type GSuiteAdminV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * Select the user to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	output: 'simplified' | 'raw' | 'select' | Expression<string>;
	/**
	 * Fields to include in the response when "Select Included Fields" is chosen
	 * @default []
	 */
	fields?: Array<
		'creationTime' | 'isAdmin' | 'kind' | 'lastLoginTime' | 'name' | 'primaryEmail' | 'suspended'
	>;
	/**
	 * What subset of fields to fetch for this user
	 * @default basic
	 */
	projection: 'basic' | 'custom' | 'full' | Expression<string>;
	/**
	 * A comma-separated list of schema names. All fields from these schemas are fetched. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	customFieldMask: string[];
};

/** Get many ChromeOS devices */
export type GSuiteAdminV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	output: 'simplified' | 'raw' | 'select' | Expression<string>;
	/**
	 * Fields to include in the response when "Select Included Fields" is chosen
	 * @default []
	 */
	fields?: Array<
		'creationTime' | 'isAdmin' | 'kind' | 'lastLoginTime' | 'name' | 'primaryEmail' | 'suspended'
	>;
	/**
	 * What subset of fields to fetch for this user
	 * @default basic
	 */
	projection: 'basic' | 'custom' | 'full' | Expression<string>;
	/**
	 * A comma-separated list of schema names. All fields from these schemas are fetched. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	customFieldMask: string[];
	filter?: Record<string, unknown>;
	/**
	 * Define sorting rules for the results
	 * @default {}
	 */
	sort?: Record<string, unknown>;
};

/** Remove a user from a group */
export type GSuiteAdminV1UserRemoveFromGroupConfig = {
	resource: 'user';
	operation: 'removeFromGroup';
	/**
	 * Select the user to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	/**
	 * Select the group to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	groupId: ResourceLocatorValue;
};

/** Update a ChromeOS device */
export type GSuiteAdminV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * Select the user to perform the operation on
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

export type GSuiteAdminV1Params =
	| GSuiteAdminV1DeviceGetConfig
	| GSuiteAdminV1DeviceGetAllConfig
	| GSuiteAdminV1DeviceUpdateConfig
	| GSuiteAdminV1DeviceChangeStatusConfig
	| GSuiteAdminV1GroupCreateConfig
	| GSuiteAdminV1GroupDeleteConfig
	| GSuiteAdminV1GroupGetConfig
	| GSuiteAdminV1GroupGetAllConfig
	| GSuiteAdminV1GroupUpdateConfig
	| GSuiteAdminV1UserAddToGroupConfig
	| GSuiteAdminV1UserCreateConfig
	| GSuiteAdminV1UserDeleteConfig
	| GSuiteAdminV1UserGetConfig
	| GSuiteAdminV1UserGetAllConfig
	| GSuiteAdminV1UserRemoveFromGroupConfig
	| GSuiteAdminV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GSuiteAdminV1Credentials {
	gSuiteAdminOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GSuiteAdminNode = {
	type: 'n8n-nodes-base.gSuiteAdmin';
	version: 1;
	config: NodeConfig<GSuiteAdminV1Params>;
	credentials?: GSuiteAdminV1Credentials;
};
