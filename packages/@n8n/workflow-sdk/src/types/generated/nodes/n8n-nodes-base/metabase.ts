/**
 * Metabase Node Types
 *
 * Use the Metabase API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/metabase/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	| MetabaseV1QuestionsResultDataConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MetabaseV1Credentials {
	metabaseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MetabaseV1Node = {
	type: 'n8n-nodes-base.metabase';
	version: 1;
	config: NodeConfig<MetabaseV1Params>;
	credentials?: MetabaseV1Credentials;
};

export type MetabaseNode = MetabaseV1Node;
