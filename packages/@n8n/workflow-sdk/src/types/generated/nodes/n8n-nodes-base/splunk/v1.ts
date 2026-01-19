/**
 * Splunk Node - Version 1
 * Consume the Splunk Enterprise API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve a fired alerts report */
export type SplunkV1FiredAlertGetReportConfig = {
	resource: 'firedAlert';
	operation: 'getReport';
};

/** Delete a search configuration */
export type SplunkV1SearchConfigurationDeleteConfig = {
	resource: 'searchConfiguration';
	operation: 'delete';
/**
 * ID of the search configuration to delete
 * @displayOptions.show { resource: ["searchConfiguration"], operation: ["delete"] }
 */
		searchConfigurationId: string | Expression<string>;
};

/** Retrieve a search configuration */
export type SplunkV1SearchConfigurationGetConfig = {
	resource: 'searchConfiguration';
	operation: 'get';
/**
 * ID of the search configuration to retrieve
 * @displayOptions.show { resource: ["searchConfiguration"], operation: ["get"] }
 */
		searchConfigurationId: string | Expression<string>;
};

/** Retrieve many search configurations */
export type SplunkV1SearchConfigurationGetAllConfig = {
	resource: 'searchConfiguration';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["searchConfiguration"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["searchConfiguration"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a search job */
export type SplunkV1SearchJobCreateConfig = {
	resource: 'searchJob';
	operation: 'create';
/**
 * Search language string to execute, in Splunk's &lt;a href="https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual"&gt;Search Processing Language&lt;/a&gt;
 * @displayOptions.show { resource: ["searchJob"], operation: ["create"] }
 */
		search: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a search configuration */
export type SplunkV1SearchJobDeleteConfig = {
	resource: 'searchJob';
	operation: 'delete';
/**
 * ID of the search job to delete
 * @displayOptions.show { resource: ["searchJob"], operation: ["delete"] }
 */
		searchJobId: string | Expression<string>;
};

/** Retrieve a search configuration */
export type SplunkV1SearchJobGetConfig = {
	resource: 'searchJob';
	operation: 'get';
/**
 * ID of the search job to retrieve
 * @displayOptions.show { resource: ["searchJob"], operation: ["get"] }
 */
		searchJobId: string | Expression<string>;
};

/** Retrieve many search configurations */
export type SplunkV1SearchJobGetAllConfig = {
	resource: 'searchJob';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["searchJob"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["searchJob"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Retrieve many search configurations */
export type SplunkV1SearchResultGetAllConfig = {
	resource: 'searchResult';
	operation: 'getAll';
/**
 * ID of the search whose results to retrieve
 * @displayOptions.show { resource: ["searchResult"], operation: ["getAll"] }
 */
		searchJobId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["searchResult"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["searchResult"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create a search job */
export type SplunkV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * Login name of the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		name: string | Expression<string>;
/**
 * Comma-separated list of roles to assign to the user. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 * @default []
 */
		roles: string[];
	password: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a search configuration */
export type SplunkV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * ID of the user to delete
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		userId: string | Expression<string>;
};

/** Retrieve a search configuration */
export type SplunkV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * ID of the user to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		userId: string | Expression<string>;
};

/** Retrieve many search configurations */
export type SplunkV1UserGetAllConfig = {
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
};

/** Update an user */
export type SplunkV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * ID of the user to update
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		userId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type SplunkV1Params =
	| SplunkV1FiredAlertGetReportConfig
	| SplunkV1SearchConfigurationDeleteConfig
	| SplunkV1SearchConfigurationGetConfig
	| SplunkV1SearchConfigurationGetAllConfig
	| SplunkV1SearchJobCreateConfig
	| SplunkV1SearchJobDeleteConfig
	| SplunkV1SearchJobGetConfig
	| SplunkV1SearchJobGetAllConfig
	| SplunkV1SearchResultGetAllConfig
	| SplunkV1UserCreateConfig
	| SplunkV1UserDeleteConfig
	| SplunkV1UserGetConfig
	| SplunkV1UserGetAllConfig
	| SplunkV1UserUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SplunkV1Credentials {
	splunkApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SplunkV1NodeBase {
	type: 'n8n-nodes-base.splunk';
	version: 1;
	credentials?: SplunkV1Credentials;
}

export type SplunkV1FiredAlertGetReportNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1FiredAlertGetReportConfig>;
};

export type SplunkV1SearchConfigurationDeleteNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchConfigurationDeleteConfig>;
};

export type SplunkV1SearchConfigurationGetNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchConfigurationGetConfig>;
};

export type SplunkV1SearchConfigurationGetAllNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchConfigurationGetAllConfig>;
};

export type SplunkV1SearchJobCreateNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchJobCreateConfig>;
};

export type SplunkV1SearchJobDeleteNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchJobDeleteConfig>;
};

export type SplunkV1SearchJobGetNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchJobGetConfig>;
};

export type SplunkV1SearchJobGetAllNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchJobGetAllConfig>;
};

export type SplunkV1SearchResultGetAllNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1SearchResultGetAllConfig>;
};

export type SplunkV1UserCreateNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1UserCreateConfig>;
};

export type SplunkV1UserDeleteNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1UserDeleteConfig>;
};

export type SplunkV1UserGetNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1UserGetConfig>;
};

export type SplunkV1UserGetAllNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1UserGetAllConfig>;
};

export type SplunkV1UserUpdateNode = SplunkV1NodeBase & {
	config: NodeConfig<SplunkV1UserUpdateConfig>;
};

export type SplunkV1Node =
	| SplunkV1FiredAlertGetReportNode
	| SplunkV1SearchConfigurationDeleteNode
	| SplunkV1SearchConfigurationGetNode
	| SplunkV1SearchConfigurationGetAllNode
	| SplunkV1SearchJobCreateNode
	| SplunkV1SearchJobDeleteNode
	| SplunkV1SearchJobGetNode
	| SplunkV1SearchJobGetAllNode
	| SplunkV1SearchResultGetAllNode
	| SplunkV1UserCreateNode
	| SplunkV1UserDeleteNode
	| SplunkV1UserGetNode
	| SplunkV1UserGetAllNode
	| SplunkV1UserUpdateNode
	;