/**
 * Splunk Node - Version 2
 * Consume the Splunk Enterprise API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
	| SplunkV2UserUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type SplunkV2SearchCreateOutput = {
	acl?: {
		app?: string;
		can_write?: boolean;
		modifiable?: boolean;
		owner?: string;
		perms?: {
			read?: Array<string>;
			write?: Array<string>;
		};
		sharing?: string;
		ttl?: string;
	};
	author?: string;
	bundleVersion?: string;
	cursorTime?: string;
	defaultSaveTTL?: string;
	defaultTTL?: string;
	delegate?: string;
	diskUsage?: number;
	dispatchState?: string;
	doneProgress?: number;
	earliestTime?: string;
	entryUrl?: string;
	id?: string;
	isDone?: boolean;
	isEventsPreviewEnabled?: boolean;
	isFailed?: boolean;
	isFinalized?: boolean;
	isPaused?: boolean;
	isPreviewEnabled?: boolean;
	isSaved?: boolean;
	isSavedSearch?: boolean;
	isZombie?: boolean;
	label?: string;
	links?: {
		alternate?: string;
		control?: string;
		events?: string;
		results?: string;
		results_preview?: string;
		'search.log'?: string;
		summary?: string;
		timeline?: string;
	};
	messages?: Array<{
		help?: string;
		text?: string;
		type?: string;
	}>;
	name?: string;
	numPreviews?: number;
	performance?: {
		'startup.configuration'?: {
			duration_secs?: number;
			invocations?: number;
		};
		'startup.handoff'?: {
			duration_secs?: number;
			invocations?: number;
		};
	};
	pid?: string;
	priority?: number;
	provenance?: string;
	published?: string;
	request?: {
		search?: string;
	};
	resultPreviewCount?: number;
	runtime?: {
		auto_cancel?: string;
		auto_pause?: string;
	};
	sampleRatio?: string;
	sampleSeed?: string;
	search?: string;
	searchProviders?: Array<string>;
	sid?: string;
	statusBuckets?: number;
	ttl?: number;
	updated?: string;
};

export type SplunkV2SearchGetResultOutput = {
	fields?: Array<{
		name?: string;
	}>;
	init_offset?: number;
	messages?: Array<{
		text?: string;
		type?: string;
	}>;
	preview?: boolean;
	results?: Array<{
		_time?: string;
		app?: string;
		attack?: string;
		dest_ip?: string;
		dest_port?: string;
		file_name?: string;
		file_path?: string;
		http_user_agent?: string;
		httpmethod?: string;
		ids_type?: string;
		src_ip?: string;
		src_port?: string;
		srccountry?: string;
		timestamp?: string;
		transport?: string;
	}>;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface SplunkV2Credentials {
	splunkApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SplunkV2NodeBase {
	type: 'n8n-nodes-base.splunk';
	version: 2;
	credentials?: SplunkV2Credentials;
}

export type SplunkV2AlertGetReportNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2AlertGetReportConfig>;
};

export type SplunkV2AlertGetMetricsNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2AlertGetMetricsConfig>;
};

export type SplunkV2ReportCreateNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2ReportCreateConfig>;
};

export type SplunkV2ReportDeleteReportNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2ReportDeleteReportConfig>;
};

export type SplunkV2ReportGetNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2ReportGetConfig>;
};

export type SplunkV2ReportGetAllNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2ReportGetAllConfig>;
};

export type SplunkV2SearchCreateNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2SearchCreateConfig>;
	output?: SplunkV2SearchCreateOutput;
};

export type SplunkV2SearchDeleteJobNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2SearchDeleteJobConfig>;
};

export type SplunkV2SearchGetNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2SearchGetConfig>;
};

export type SplunkV2SearchGetAllNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2SearchGetAllConfig>;
};

export type SplunkV2SearchGetResultNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2SearchGetResultConfig>;
	output?: SplunkV2SearchGetResultOutput;
};

export type SplunkV2UserCreateNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2UserCreateConfig>;
};

export type SplunkV2UserDeleteUserNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2UserDeleteUserConfig>;
};

export type SplunkV2UserGetNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2UserGetConfig>;
};

export type SplunkV2UserGetAllNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2UserGetAllConfig>;
};

export type SplunkV2UserUpdateNode = SplunkV2NodeBase & {
	config: NodeConfig<SplunkV2UserUpdateConfig>;
};

export type SplunkV2Node =
	| SplunkV2AlertGetReportNode
	| SplunkV2AlertGetMetricsNode
	| SplunkV2ReportCreateNode
	| SplunkV2ReportDeleteReportNode
	| SplunkV2ReportGetNode
	| SplunkV2ReportGetAllNode
	| SplunkV2SearchCreateNode
	| SplunkV2SearchDeleteJobNode
	| SplunkV2SearchGetNode
	| SplunkV2SearchGetAllNode
	| SplunkV2SearchGetResultNode
	| SplunkV2UserCreateNode
	| SplunkV2UserDeleteUserNode
	| SplunkV2UserGetNode
	| SplunkV2UserGetAllNode
	| SplunkV2UserUpdateNode
	;