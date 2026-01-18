/**
 * MongoDB Atlas Vector Store Node Types
 *
 * Work with your data in MongoDB Atlas Vector Store
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstoremongodbatlas/
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
	 */
	prompt: string | Expression<string>;
	/**
	 * Number of top results to fetch from vector store
	 * @default 4
	 */
	topK?: number | Expression<number>;
	/**
	 * Whether or not to include document metadata
	 * @default true
	 */
	includeDocumentMetadata?: boolean | Expression<boolean>;
	/**
	 * Whether or not to rerank results
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
	/**
	 * Number of documents to embed in a single batch
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
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
	 * Name of the vector store
	 */
	toolName: string | Expression<string>;
	/**
	 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
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
	 * @default 4
	 */
	topK?: number | Expression<number>;
	/**
	 * Whether or not to include document metadata
	 * @default true
	 */
	includeDocumentMetadata?: boolean | Expression<boolean>;
	/**
	 * Whether or not to rerank results
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
	 */
	id: string | Expression<string>;
};

export type LcVectorStoreMongoDBAtlasV13Params =
	| LcVectorStoreMongoDBAtlasV13LoadConfig
	| LcVectorStoreMongoDBAtlasV13InsertConfig
	| LcVectorStoreMongoDBAtlasV13RetrieveConfig
	| LcVectorStoreMongoDBAtlasV13RetrieveAsToolConfig
	| LcVectorStoreMongoDBAtlasV13UpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreMongoDBAtlasV13Credentials {
	mongoDb: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcVectorStoreMongoDBAtlasV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreMongoDBAtlasV13Params>;
	credentials?: LcVectorStoreMongoDBAtlasV13Credentials;
};

export type LcVectorStoreMongoDBAtlasNode = LcVectorStoreMongoDBAtlasV13Node;
