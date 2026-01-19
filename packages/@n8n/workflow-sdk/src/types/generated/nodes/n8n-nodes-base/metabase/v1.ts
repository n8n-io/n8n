/**
 * Metabase Node - Version 1
 * Use the Metabase API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a specific question */
export type MetabaseV1AlertsGetConfig = {
	resource: 'alerts';
	operation: 'get';
	alertId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Get many questions */
export type MetabaseV1AlertsGetAllConfig = {
	resource: 'alerts';
	operation: 'getAll';
	requestOptions?: Record<string, unknown>;
};

/** Add a new datasource to the metabase instance */
export type MetabaseV1DatabasesAddNewDatasourceConfig = {
	resource: 'databases';
	operation: 'addNewDatasource';
	engine: 'h2' | 'mongo' | 'mysql' | 'postgres' | 'redshift' | 'sqlite' | Expression<string>;
	host: string | Expression<string>;
	name: string | Expression<string>;
	port: number | Expression<number>;
	user: string | Expression<string>;
	password: string | Expression<string>;
	dbName?: string | Expression<string>;
	filePath: string | Expression<string>;
	fullSync: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get many questions */
export type MetabaseV1DatabasesGetAllConfig = {
	resource: 'databases';
	operation: 'getAll';
/**
 * Whether to return a simplified version of the response instead of the raw data
 * @displayOptions.show { resource: ["databases"], operation: ["getAll"] }
 * @default true
 */
		simple?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get fields from database */
export type MetabaseV1DatabasesGetFieldsConfig = {
	resource: 'databases';
	operation: 'getFields';
	databaseId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Get a specific question */
export type MetabaseV1MetricsGetConfig = {
	resource: 'metrics';
	operation: 'get';
	metricId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Get many questions */
export type MetabaseV1MetricsGetAllConfig = {
	resource: 'metrics';
	operation: 'getAll';
	requestOptions?: Record<string, unknown>;
};

/** Get a specific question */
export type MetabaseV1QuestionsGetConfig = {
	resource: 'questions';
	operation: 'get';
	questionId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

/** Get many questions */
export type MetabaseV1QuestionsGetAllConfig = {
	resource: 'questions';
	operation: 'getAll';
	requestOptions?: Record<string, unknown>;
};

/** Return the result of the question to a specific file format */
export type MetabaseV1QuestionsResultDataConfig = {
	resource: 'questions';
	operation: 'resultData';
	questionId: string | Expression<string>;
	format: 'csv' | 'json' | 'xlsx' | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type MetabaseV1Params =
	| MetabaseV1AlertsGetConfig
	| MetabaseV1AlertsGetAllConfig
	| MetabaseV1DatabasesAddNewDatasourceConfig
	| MetabaseV1DatabasesGetAllConfig
	| MetabaseV1DatabasesGetFieldsConfig
	| MetabaseV1MetricsGetConfig
	| MetabaseV1MetricsGetAllConfig
	| MetabaseV1QuestionsGetConfig
	| MetabaseV1QuestionsGetAllConfig
	| MetabaseV1QuestionsResultDataConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type MetabaseV1DatabasesGetAllOutput = {
	created_at?: string;
	engine?: string;
	id?: number;
	name?: string;
	updated_at?: string;
};

export type MetabaseV1DatabasesGetFieldsOutput = {
	base_type?: string;
	display_name?: string;
	id?: number;
	name?: string;
	table_id?: number;
	table_name?: string;
};

export type MetabaseV1QuestionsGetOutput = {
	archived?: boolean;
	archived_directly?: boolean;
	cache_ttl?: null;
	can_delete?: boolean;
	can_manage_db?: boolean;
	can_restore?: boolean;
	can_run_adhoc_query?: boolean;
	can_write?: boolean;
	collection?: {
		archive_operation_id?: null;
		archived?: boolean;
		archived_directly?: null;
		authority_level?: null;
		created_at?: string;
		is_personal?: boolean;
		is_sample?: boolean;
		location?: string;
		name?: string;
		namespace?: null;
		slug?: string;
		type?: null;
	};
	collection_preview?: boolean;
	created_at?: string;
	creator?: {
		common_name?: string;
		date_joined?: string;
		email?: string;
		id?: number;
		is_qbnewb?: boolean;
		is_superuser?: boolean;
		tenant_id?: null;
	};
	creator_id?: number;
	dashboard_count?: number;
	database_id?: number;
	dataset_query?: {
		database?: number;
		native?: {
			query?: string;
		};
		type?: string;
	};
	display?: string;
	embedding_params?: null;
	enable_embedding?: boolean;
	id?: number;
	initially_published_at?: null;
	last_used_at?: string;
	'last-edit-info'?: {
		email?: string;
		id?: number;
		timestamp?: string;
	};
	moderation_reviews?: Array<{
		created_at?: string;
		id?: number;
		moderated_item_id?: number;
		moderated_item_type?: string;
		moderator_id?: number;
		most_recent?: boolean;
		status?: string;
		text?: null | string;
		updated_at?: string;
		user?: {
			common_name?: string;
			date_joined?: string;
			email?: string;
			first_name?: string;
			id?: number;
			is_qbnewb?: boolean;
			is_superuser?: boolean;
			last_login?: string;
			last_name?: string;
		};
	}>;
	name?: string;
	parameter_usage_count?: number;
	query_type?: string;
	type?: string;
	updated_at?: string;
	view_count?: number;
	visualization_settings?: {
		'table.cell_column'?: string;
		'table.pivot_column'?: string;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MetabaseV1Credentials {
	metabaseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MetabaseV1NodeBase {
	type: 'n8n-nodes-base.metabase';
	version: 1;
	credentials?: MetabaseV1Credentials;
}

export type MetabaseV1AlertsGetNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1AlertsGetConfig>;
};

export type MetabaseV1AlertsGetAllNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1AlertsGetAllConfig>;
};

export type MetabaseV1DatabasesAddNewDatasourceNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1DatabasesAddNewDatasourceConfig>;
};

export type MetabaseV1DatabasesGetAllNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1DatabasesGetAllConfig>;
	output?: MetabaseV1DatabasesGetAllOutput;
};

export type MetabaseV1DatabasesGetFieldsNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1DatabasesGetFieldsConfig>;
	output?: MetabaseV1DatabasesGetFieldsOutput;
};

export type MetabaseV1MetricsGetNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1MetricsGetConfig>;
};

export type MetabaseV1MetricsGetAllNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1MetricsGetAllConfig>;
};

export type MetabaseV1QuestionsGetNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1QuestionsGetConfig>;
	output?: MetabaseV1QuestionsGetOutput;
};

export type MetabaseV1QuestionsGetAllNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1QuestionsGetAllConfig>;
};

export type MetabaseV1QuestionsResultDataNode = MetabaseV1NodeBase & {
	config: NodeConfig<MetabaseV1QuestionsResultDataConfig>;
};

export type MetabaseV1Node =
	| MetabaseV1AlertsGetNode
	| MetabaseV1AlertsGetAllNode
	| MetabaseV1DatabasesAddNewDatasourceNode
	| MetabaseV1DatabasesGetAllNode
	| MetabaseV1DatabasesGetFieldsNode
	| MetabaseV1MetricsGetNode
	| MetabaseV1MetricsGetAllNode
	| MetabaseV1QuestionsGetNode
	| MetabaseV1QuestionsGetAllNode
	| MetabaseV1QuestionsResultDataNode
	;