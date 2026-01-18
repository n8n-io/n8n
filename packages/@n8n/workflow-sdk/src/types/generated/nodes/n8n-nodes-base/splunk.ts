/**
 * Splunk Node Types
 *
 * Consume the Splunk Enterprise API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/splunk/
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

/** Retrieve a fired alerts report */
export type SplunkV2AlertGetReportConfig = {
	resource: 'alert';
	operation: 'getReport';
};

/** Retrieve metrics */
export type SplunkV2AlertGetMetricsConfig = {
	resource: 'alert';
	operation: 'getMetrics';
};

/** Create a search report from a search job */
export type SplunkV2ReportCreateConfig = {
	resource: 'report';
	operation: 'create';
	searchJobId: ResourceLocatorValue;
	/**
	 * The name of the report
	 * @displayOptions.show { resource: ["report"], operation: ["create"] }
	 */
	name?: string | Expression<string>;
};

/** Delete a search report */
export type SplunkV2ReportDeleteReportConfig = {
	resource: 'report';
	operation: 'deleteReport';
	reportId: ResourceLocatorValue;
};

/** Retrieve a search report */
export type SplunkV2ReportGetConfig = {
	resource: 'report';
	operation: 'get';
	reportId: ResourceLocatorValue;
};

/** Retrieve many search reports */
export type SplunkV2ReportGetAllConfig = {
	resource: 'report';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["report"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["report"], operation: ["getAll"] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a search report from a search job */
export type SplunkV2SearchCreateConfig = {
	resource: 'search';
	operation: 'create';
	/**
	 * Search language string to execute, in Splunk's &lt;a href="https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/WhatsInThisManual"&gt;Search Processing Language&lt;/a&gt;
	 * @displayOptions.show { resource: ["search"], operation: ["create"] }
	 */
	search: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a search job */
export type SplunkV2SearchDeleteJobConfig = {
	resource: 'search';
	operation: 'deleteJob';
	searchJobId: ResourceLocatorValue;
};

/** Retrieve a search report */
export type SplunkV2SearchGetConfig = {
	resource: 'search';
	operation: 'get';
	searchJobId: ResourceLocatorValue;
};

/** Retrieve many search reports */
export type SplunkV2SearchGetAllConfig = {
	resource: 'search';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["search"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["search"], operation: ["getAll"] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	sort?: {
		values?: {
			/** Sort Direction
			 * @default asc
			 */
			sort_dir?: 'asc' | 'desc' | Expression<string>;
			/** Key name to use for sorting
			 */
			sort_key?: string | Expression<string>;
			/** Sort Mode
			 * @default auto
			 */
			sort_mode?: 'auto' | 'alpha' | 'alpha_case' | 'num' | Expression<string>;
		};
	};
};

/** Get the result of a search job */
export type SplunkV2SearchGetResultConfig = {
	resource: 'search';
	operation: 'getResult';
	searchJobId: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["search"], operation: ["getResult"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["search"], operation: ["getResult"] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Create a search report from a search job */
export type SplunkV2UserCreateConfig = {
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
	 * @default ["user"]
	 */
	roles: string[];
	password: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an user */
export type SplunkV2UserDeleteUserConfig = {
	resource: 'user';
	operation: 'deleteUser';
	userId: ResourceLocatorValue;
};

/** Retrieve a search report */
export type SplunkV2UserGetConfig = {
	resource: 'user';
	operation: 'get';
	userId: ResourceLocatorValue;
};

/** Retrieve many search reports */
export type SplunkV2UserGetAllConfig = {
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
	 * @displayOptions.show { returnAll: [false], resource: ["user"], operation: ["getAll"] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update an user */
export type SplunkV2UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	userId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

export type SplunkV2Params =
	| SplunkV2AlertGetReportConfig
	| SplunkV2AlertGetMetricsConfig
	| SplunkV2ReportCreateConfig
	| SplunkV2ReportDeleteReportConfig
	| SplunkV2ReportGetConfig
	| SplunkV2ReportGetAllConfig
	| SplunkV2SearchCreateConfig
	| SplunkV2SearchDeleteJobConfig
	| SplunkV2SearchGetConfig
	| SplunkV2SearchGetAllConfig
	| SplunkV2SearchGetResultConfig
	| SplunkV2UserCreateConfig
	| SplunkV2UserDeleteUserConfig
	| SplunkV2UserGetConfig
	| SplunkV2UserGetAllConfig
	| SplunkV2UserUpdateConfig;

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
	| SplunkV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SplunkV2Credentials {
	splunkApi: CredentialReference;
}

export interface SplunkV1Credentials {
	splunkApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SplunkV2Node = {
	type: 'n8n-nodes-base.splunk';
	version: 2;
	config: NodeConfig<SplunkV2Params>;
	credentials?: SplunkV2Credentials;
};

export type SplunkV1Node = {
	type: 'n8n-nodes-base.splunk';
	version: 1;
	config: NodeConfig<SplunkV1Params>;
	credentials?: SplunkV1Credentials;
};

export type SplunkNode = SplunkV2Node | SplunkV1Node;
