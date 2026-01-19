/**
 * MongoDB Atlas Vector Store Node - Version 1.3
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
export type LcVectorStoreMongoDBAtlasV13LoadConfig = {
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
export type LcVectorStoreMongoDBAtlasV13InsertConfig = {
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
export type LcVectorStoreMongoDBAtlasV13RetrieveConfig = {
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
export type LcVectorStoreMongoDBAtlasV13RetrieveAsToolConfig = {
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
export type LcVectorStoreMongoDBAtlasV13UpdateConfig = {
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

export interface LcVectorStoreMongoDBAtlasV13Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreMongoDBAtlasV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas';
	version: 1.3;
	credentials?: LcVectorStoreMongoDBAtlasV13Credentials;
}

export type LcVectorStoreMongoDBAtlasV13LoadNode = LcVectorStoreMongoDBAtlasV13NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV13LoadConfig>;
};

export type LcVectorStoreMongoDBAtlasV13InsertNode = LcVectorStoreMongoDBAtlasV13NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV13InsertConfig>;
};

export type LcVectorStoreMongoDBAtlasV13RetrieveNode = LcVectorStoreMongoDBAtlasV13NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV13RetrieveConfig>;
};

export type LcVectorStoreMongoDBAtlasV13RetrieveAsToolNode = LcVectorStoreMongoDBAtlasV13NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV13RetrieveAsToolConfig>;
};

export type LcVectorStoreMongoDBAtlasV13UpdateNode = LcVectorStoreMongoDBAtlasV13NodeBase & {
	config: NodeConfig<LcVectorStoreMongoDBAtlasV13UpdateConfig>;
};

export type LcVectorStoreMongoDBAtlasV13Node =
	| LcVectorStoreMongoDBAtlasV13LoadNode
	| LcVectorStoreMongoDBAtlasV13InsertNode
	| LcVectorStoreMongoDBAtlasV13RetrieveNode
	| LcVectorStoreMongoDBAtlasV13RetrieveAsToolNode
	| LcVectorStoreMongoDBAtlasV13UpdateNode
	;