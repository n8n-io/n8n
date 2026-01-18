/**
 * MongoDB Node Types
 *
 * Find, insert and update documents in MongoDB
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mongodb/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MongoDbV12SearchIndexesCreateSearchIndexConfig = {
	resource: 'searchIndexes';
	operation: 'createSearchIndex';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * The name of the search index
	 */
	indexNameRequired: string | Expression<string>;
	/**
	 * The search index definition
	 * @hint Learn more about search index definitions &lt;a href="https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/"&gt;here&lt;/a&gt;
	 * @default {}
	 */
	indexDefinition: IDataObject | string | Expression<string>;
	/**
	 * The search index index type
	 * @default vectorSearch
	 */
	indexType: 'vectorSearch' | 'search' | Expression<string>;
};

export type MongoDbV12SearchIndexesDropSearchIndexConfig = {
	resource: 'searchIndexes';
	operation: 'dropSearchIndex';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * The name of the search index
	 */
	indexNameRequired: string | Expression<string>;
};

export type MongoDbV12SearchIndexesListSearchIndexesConfig = {
	resource: 'searchIndexes';
	operation: 'listSearchIndexes';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * If provided, only lists indexes with the specified name
	 */
	indexName?: string | Expression<string>;
};

export type MongoDbV12SearchIndexesUpdateSearchIndexConfig = {
	resource: 'searchIndexes';
	operation: 'updateSearchIndex';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * The name of the search index
	 */
	indexNameRequired: string | Expression<string>;
	/**
	 * The search index definition
	 * @hint Learn more about search index definitions &lt;a href="https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/"&gt;here&lt;/a&gt;
	 * @default {}
	 */
	indexDefinition: IDataObject | string | Expression<string>;
};

/** Aggregate documents */
export type MongoDbV12DocumentAggregateConfig = {
	resource: 'document';
	operation: 'aggregate';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * MongoDB aggregation pipeline query in JSON format
	 * @hint Learn more about aggregation pipeline &lt;a href="https://docs.mongodb.com/manual/core/aggregation-pipeline/"&gt;here&lt;/a&gt;
	 */
	query: IDataObject | string | Expression<string>;
};

/** Delete documents */
export type MongoDbV12DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * MongoDB Delete query
	 * @default {}
	 */
	query: IDataObject | string | Expression<string>;
};

/** Find documents */
export type MongoDbV12DocumentFindConfig = {
	resource: 'document';
	operation: 'find';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * Add query options
	 * @default {}
	 */
	options?: Record<string, unknown>;
	/**
	 * MongoDB Find query
	 * @default {}
	 */
	query: IDataObject | string | Expression<string>;
};

/** Find and replace documents */
export type MongoDbV12DocumentFindOneAndReplaceConfig = {
	resource: 'document';
	operation: 'findOneAndReplace';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
	 * @default id
	 */
	updateKey: string | Expression<string>;
	/**
	 * Comma-separated list of the fields to be included into the new document
	 */
	fields?: string | Expression<string>;
	/**
	 * Whether to perform an insert if no documents match the update key
	 * @default false
	 */
	upsert?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Find and update documents */
export type MongoDbV12DocumentFindOneAndUpdateConfig = {
	resource: 'document';
	operation: 'findOneAndUpdate';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
	 * @default id
	 */
	updateKey: string | Expression<string>;
	/**
	 * Comma-separated list of the fields to be included into the new document
	 */
	fields?: string | Expression<string>;
	/**
	 * Whether to perform an insert if no documents match the update key
	 * @default false
	 */
	upsert?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Insert documents */
export type MongoDbV12DocumentInsertConfig = {
	resource: 'document';
	operation: 'insert';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * Comma-separated list of the fields to be included into the new document
	 */
	fields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update documents */
export type MongoDbV12DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
	/**
	 * MongoDB Collection
	 */
	collection: string | Expression<string>;
	/**
	 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
	 * @default id
	 */
	updateKey: string | Expression<string>;
	/**
	 * Comma-separated list of the fields to be included into the new document
	 */
	fields?: string | Expression<string>;
	/**
	 * Whether to perform an insert if no documents match the update key
	 * @default false
	 */
	upsert?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type MongoDbV12Params =
	| MongoDbV12SearchIndexesCreateSearchIndexConfig
	| MongoDbV12SearchIndexesDropSearchIndexConfig
	| MongoDbV12SearchIndexesListSearchIndexesConfig
	| MongoDbV12SearchIndexesUpdateSearchIndexConfig
	| MongoDbV12DocumentAggregateConfig
	| MongoDbV12DocumentDeleteConfig
	| MongoDbV12DocumentFindConfig
	| MongoDbV12DocumentFindOneAndReplaceConfig
	| MongoDbV12DocumentFindOneAndUpdateConfig
	| MongoDbV12DocumentInsertConfig
	| MongoDbV12DocumentUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MongoDbV12Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MongoDbV12Node = {
	type: 'n8n-nodes-base.mongoDb';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<MongoDbV12Params>;
	credentials?: MongoDbV12Credentials;
};

export type MongoDbNode = MongoDbV12Node;
