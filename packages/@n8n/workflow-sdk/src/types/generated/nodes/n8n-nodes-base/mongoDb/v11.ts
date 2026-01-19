/**
 * MongoDB Node - Version 1.1
 * Find, insert and update documents in MongoDB
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type MongoDbV11SearchIndexesCreateSearchIndexConfig = {
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

export type MongoDbV11SearchIndexesDropSearchIndexConfig = {
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

export type MongoDbV11SearchIndexesListSearchIndexesConfig = {
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

export type MongoDbV11SearchIndexesUpdateSearchIndexConfig = {
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
export type MongoDbV11DocumentAggregateConfig = {
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
export type MongoDbV11DocumentDeleteConfig = {
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
export type MongoDbV11DocumentFindConfig = {
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
export type MongoDbV11DocumentFindOneAndReplaceConfig = {
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
export type MongoDbV11DocumentFindOneAndUpdateConfig = {
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
export type MongoDbV11DocumentInsertConfig = {
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
export type MongoDbV11DocumentUpdateConfig = {
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface MongoDbV11Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MongoDbV11NodeBase {
	type: 'n8n-nodes-base.mongoDb';
	version: 1.1;
	credentials?: MongoDbV11Credentials;
}

export type MongoDbV11SearchIndexesCreateSearchIndexNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11SearchIndexesCreateSearchIndexConfig>;
};

export type MongoDbV11SearchIndexesDropSearchIndexNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11SearchIndexesDropSearchIndexConfig>;
};

export type MongoDbV11SearchIndexesListSearchIndexesNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11SearchIndexesListSearchIndexesConfig>;
};

export type MongoDbV11SearchIndexesUpdateSearchIndexNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11SearchIndexesUpdateSearchIndexConfig>;
};

export type MongoDbV11DocumentAggregateNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentAggregateConfig>;
};

export type MongoDbV11DocumentDeleteNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentDeleteConfig>;
};

export type MongoDbV11DocumentFindNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentFindConfig>;
};

export type MongoDbV11DocumentFindOneAndReplaceNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentFindOneAndReplaceConfig>;
};

export type MongoDbV11DocumentFindOneAndUpdateNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentFindOneAndUpdateConfig>;
};

export type MongoDbV11DocumentInsertNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentInsertConfig>;
};

export type MongoDbV11DocumentUpdateNode = MongoDbV11NodeBase & {
	config: NodeConfig<MongoDbV11DocumentUpdateConfig>;
};

export type MongoDbV11Node =
	| MongoDbV11SearchIndexesCreateSearchIndexNode
	| MongoDbV11SearchIndexesDropSearchIndexNode
	| MongoDbV11SearchIndexesListSearchIndexesNode
	| MongoDbV11SearchIndexesUpdateSearchIndexNode
	| MongoDbV11DocumentAggregateNode
	| MongoDbV11DocumentDeleteNode
	| MongoDbV11DocumentFindNode
	| MongoDbV11DocumentFindOneAndReplaceNode
	| MongoDbV11DocumentFindOneAndUpdateNode
	| MongoDbV11DocumentInsertNode
	| MongoDbV11DocumentUpdateNode
	;