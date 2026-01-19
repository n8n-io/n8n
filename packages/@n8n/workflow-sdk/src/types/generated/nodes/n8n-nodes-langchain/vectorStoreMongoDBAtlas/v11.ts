/**
 * MongoDB Atlas Vector Store Node - Version 1.1
 * Work with your data in MongoDB Atlas Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreMongoDBAtlasV11LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	mongoCollection: ResourceLocatorValue;
/**
 * The field with the embedding array
 * @default embedding
 */
		embedding: string | Expression<string>;
/**
 * The text field of the raw data
 * @default text
 */
		metadata_field: string | Expression<string>;
/**
 * The name of the vector index
 */
		vectorIndexName: string | Expression<string>;
/**
 * Search prompt to retrieve matching documents from the vector store using similarity-based ranking
 * @displayOptions.show { mode: ["load"] }
 */
		prompt: string | Expression<string>;
/**
 * Number of top results to fetch from vector store
 * @displayOptions.show { mode: ["load", "retrieve-as-tool"] }
 * @default 4
 */
		topK?: number | Expression<number>;
/**
 * Whether or not to include document metadata
 * @displayOptions.show { mode: ["load", "retrieve-as-tool"] }
 * @default true
 */
		includeDocumentMetadata?: boolean | Expression<boolean>;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Insert documents into vector store */
export type LcVectorStoreMongoDBAtlasV11InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	mongoCollection: ResourceLocatorValue;
/**
 * The field with the embedding array
 * @default embedding
 */
		embedding: string | Expression<string>;
/**
 * The text field of the raw data
 * @default text
 */
		metadata_field: string | Expression<string>;
/**
 * The name of the vector index
 */
		vectorIndexName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreMongoDBAtlasV11RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	mongoCollection: ResourceLocatorValue;
/**
 * The field with the embedding array
 * @default embedding
 */
		embedding: string | Expression<string>;
/**
 * The text field of the raw data
 * @default text
 */
		metadata_field: string | Expression<string>;
/**
 * The name of the vector index
 */
		vectorIndexName: string | Expression<string>;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreMongoDBAtlasV11RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	mongoCollection: ResourceLocatorValue;
/**
 * The field with the embedding array
 * @default embedding
 */
		embedding: string | Expression<string>;
/**
 * The text field of the raw data
 * @default text
 */
		metadata_field: string | Expression<string>;
/**
 * The name of the vector index
 */
		vectorIndexName: string | Expression<string>;
/**
 * Number of top results to fetch from vector store
 * @displayOptions.show { mode: ["load", "retrieve-as-tool"] }
 * @default 4
 */
		topK?: number | Expression<number>;
/**
 * Whether or not to include document metadata
 * @displayOptions.show { mode: ["load", "retrieve-as-tool"] }
 * @default true
 */
		includeDocumentMetadata?: boolean | Expression<boolean>;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Update documents in vector store by ID */
export type LcVectorStoreMongoDBAtlasV11UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	mongoCollection: ResourceLocatorValue;
/**
 * The field with the embedding array
 * @default embedding
 */
		embedding: string | Expression<string>;
/**
 * The text field of the raw data
 * @default text
 */
		metadata_field: string | Expression<string>;
/**
 * The name of the vector index
 */
		vectorIndexName: string | Expression<string>;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreMongoDBAtlasV11Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreMongoDBAtlasV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas';
	version: 1.1;
	credentials?: LcVectorStoreMongoDBAtlasV11Credentials;
}

export type LcVectorStoreMongoDBAtlasV11LoadNode = LcVectorStoreMongoDBAtlasV11NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV11LoadConfig>;
};

export type LcVectorStoreMongoDBAtlasV11InsertNode = LcVectorStoreMongoDBAtlasV11NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV11InsertConfig>;
};

export type LcVectorStoreMongoDBAtlasV11RetrieveNode = LcVectorStoreMongoDBAtlasV11NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV11RetrieveConfig>;
};

export type LcVectorStoreMongoDBAtlasV11RetrieveAsToolNode = LcVectorStoreMongoDBAtlasV11NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV11RetrieveAsToolConfig>;
};

export type LcVectorStoreMongoDBAtlasV11UpdateNode = LcVectorStoreMongoDBAtlasV11NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV11UpdateConfig>;
};

export type LcVectorStoreMongoDBAtlasV11Node =
	| LcVectorStoreMongoDBAtlasV11LoadNode
	| LcVectorStoreMongoDBAtlasV11InsertNode
	| LcVectorStoreMongoDBAtlasV11RetrieveNode
	| LcVectorStoreMongoDBAtlasV11RetrieveAsToolNode
	| LcVectorStoreMongoDBAtlasV11UpdateNode
	;