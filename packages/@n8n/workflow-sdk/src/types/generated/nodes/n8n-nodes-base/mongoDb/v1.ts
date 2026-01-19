/**
 * MongoDB Node - Version 1
 * Find, insert and update documents in MongoDB
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MongoDbV1SearchIndexesCreateSearchIndexConfig = {
	resource: 'searchIndexes';
	operation: 'createSearchIndex';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * The name of the search index
 * @displayOptions.show { operation: ["createSearchIndex", "dropSearchIndex", "updateSearchIndex"], resource: ["searchIndexes"] }
 */
		indexNameRequired: string | Expression<string>;
/**
 * The search index definition
 * @hint Learn more about search index definitions &lt;a href="https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/"&gt;here&lt;/a&gt;
 * @displayOptions.show { operation: ["createSearchIndex", "updateSearchIndex"], resource: ["searchIndexes"] }
 * @default {}
 */
		indexDefinition: IDataObject | string | Expression<string>;
/**
 * The search index index type
 * @displayOptions.show { operation: ["createSearchIndex"], resource: ["searchIndexes"] }
 * @default vectorSearch
 */
		indexType: 'vectorSearch' | 'search' | Expression<string>;
};

export type MongoDbV1SearchIndexesDropSearchIndexConfig = {
	resource: 'searchIndexes';
	operation: 'dropSearchIndex';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * The name of the search index
 * @displayOptions.show { operation: ["createSearchIndex", "dropSearchIndex", "updateSearchIndex"], resource: ["searchIndexes"] }
 */
		indexNameRequired: string | Expression<string>;
};

export type MongoDbV1SearchIndexesListSearchIndexesConfig = {
	resource: 'searchIndexes';
	operation: 'listSearchIndexes';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * If provided, only lists indexes with the specified name
 * @displayOptions.show { operation: ["listSearchIndexes"], resource: ["searchIndexes"] }
 */
		indexName?: string | Expression<string>;
};

export type MongoDbV1SearchIndexesUpdateSearchIndexConfig = {
	resource: 'searchIndexes';
	operation: 'updateSearchIndex';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * The name of the search index
 * @displayOptions.show { operation: ["createSearchIndex", "dropSearchIndex", "updateSearchIndex"], resource: ["searchIndexes"] }
 */
		indexNameRequired: string | Expression<string>;
/**
 * The search index definition
 * @hint Learn more about search index definitions &lt;a href="https://www.mongodb.com/docs/atlas/atlas-search/index-definitions/"&gt;here&lt;/a&gt;
 * @displayOptions.show { operation: ["createSearchIndex", "updateSearchIndex"], resource: ["searchIndexes"] }
 * @default {}
 */
		indexDefinition: IDataObject | string | Expression<string>;
};

/** Aggregate documents */
export type MongoDbV1DocumentAggregateConfig = {
	resource: 'document';
	operation: 'aggregate';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * MongoDB aggregation pipeline query in JSON format
 * @hint Learn more about aggregation pipeline &lt;a href="https://docs.mongodb.com/manual/core/aggregation-pipeline/"&gt;here&lt;/a&gt;
 * @displayOptions.show { operation: ["aggregate"], resource: ["document"] }
 */
		query: IDataObject | string | Expression<string>;
};

/** Delete documents */
export type MongoDbV1DocumentDeleteConfig = {
	resource: 'document';
	operation: 'delete';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * MongoDB Delete query
 * @displayOptions.show { operation: ["delete"], resource: ["document"] }
 * @default {}
 */
		query: IDataObject | string | Expression<string>;
};

/** Find documents */
export type MongoDbV1DocumentFindConfig = {
	resource: 'document';
	operation: 'find';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * Add query options
 * @displayOptions.show { operation: ["find"], resource: ["document"] }
 * @default {}
 */
		options?: Record<string, unknown>;
/**
 * MongoDB Find query
 * @displayOptions.show { operation: ["find"], resource: ["document"] }
 * @default {}
 */
		query: IDataObject | string | Expression<string>;
};

/** Find and replace documents */
export type MongoDbV1DocumentFindOneAndReplaceConfig = {
	resource: 'document';
	operation: 'findOneAndReplace';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 * @default id
 */
		updateKey: string | Expression<string>;
/**
 * Comma-separated list of the fields to be included into the new document
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 */
		fields?: string | Expression<string>;
/**
 * Whether to perform an insert if no documents match the update key
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 * @default false
 */
		upsert?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Find and update documents */
export type MongoDbV1DocumentFindOneAndUpdateConfig = {
	resource: 'document';
	operation: 'findOneAndUpdate';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 * @default id
 */
		updateKey: string | Expression<string>;
/**
 * Comma-separated list of the fields to be included into the new document
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 */
		fields?: string | Expression<string>;
/**
 * Whether to perform an insert if no documents match the update key
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 * @default false
 */
		upsert?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Insert documents */
export type MongoDbV1DocumentInsertConfig = {
	resource: 'document';
	operation: 'insert';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * Comma-separated list of the fields to be included into the new document
 * @displayOptions.show { operation: ["insert"], resource: ["document"] }
 */
		fields?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Update documents */
export type MongoDbV1DocumentUpdateConfig = {
	resource: 'document';
	operation: 'update';
/**
 * MongoDB Collection
 */
		collection: string | Expression<string>;
/**
 * Name of the property which decides which rows in the database should be updated. Normally that would be "id".
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 * @default id
 */
		updateKey: string | Expression<string>;
/**
 * Comma-separated list of the fields to be included into the new document
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 */
		fields?: string | Expression<string>;
/**
 * Whether to perform an insert if no documents match the update key
 * @displayOptions.show { operation: ["update", "findOneAndReplace", "findOneAndUpdate"], resource: ["document"] }
 * @default false
 */
		upsert?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

export type MongoDbV1Params =
	| MongoDbV1SearchIndexesCreateSearchIndexConfig
	| MongoDbV1SearchIndexesDropSearchIndexConfig
	| MongoDbV1SearchIndexesListSearchIndexesConfig
	| MongoDbV1SearchIndexesUpdateSearchIndexConfig
	| MongoDbV1DocumentAggregateConfig
	| MongoDbV1DocumentDeleteConfig
	| MongoDbV1DocumentFindConfig
	| MongoDbV1DocumentFindOneAndReplaceConfig
	| MongoDbV1DocumentFindOneAndUpdateConfig
	| MongoDbV1DocumentInsertConfig
	| MongoDbV1DocumentUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MongoDbV1Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MongoDbV1NodeBase {
	type: 'n8n-nodes-base.mongoDb';
	version: 1;
	credentials?: MongoDbV1Credentials;
}

export type MongoDbV1SearchIndexesCreateSearchIndexNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1SearchIndexesCreateSearchIndexConfig>;
};

export type MongoDbV1SearchIndexesDropSearchIndexNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1SearchIndexesDropSearchIndexConfig>;
};

export type MongoDbV1SearchIndexesListSearchIndexesNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1SearchIndexesListSearchIndexesConfig>;
};

export type MongoDbV1SearchIndexesUpdateSearchIndexNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1SearchIndexesUpdateSearchIndexConfig>;
};

export type MongoDbV1DocumentAggregateNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentAggregateConfig>;
};

export type MongoDbV1DocumentDeleteNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentDeleteConfig>;
};

export type MongoDbV1DocumentFindNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentFindConfig>;
};

export type MongoDbV1DocumentFindOneAndReplaceNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentFindOneAndReplaceConfig>;
};

export type MongoDbV1DocumentFindOneAndUpdateNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentFindOneAndUpdateConfig>;
};

export type MongoDbV1DocumentInsertNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentInsertConfig>;
};

export type MongoDbV1DocumentUpdateNode = MongoDbV1NodeBase & {
	config: NodeConfig<MongoDbV1DocumentUpdateConfig>;
};

export type MongoDbV1Node =
	| MongoDbV1SearchIndexesCreateSearchIndexNode
	| MongoDbV1SearchIndexesDropSearchIndexNode
	| MongoDbV1SearchIndexesListSearchIndexesNode
	| MongoDbV1SearchIndexesUpdateSearchIndexNode
	| MongoDbV1DocumentAggregateNode
	| MongoDbV1DocumentDeleteNode
	| MongoDbV1DocumentFindNode
	| MongoDbV1DocumentFindOneAndReplaceNode
	| MongoDbV1DocumentFindOneAndUpdateNode
	| MongoDbV1DocumentInsertNode
	| MongoDbV1DocumentUpdateNode
	;