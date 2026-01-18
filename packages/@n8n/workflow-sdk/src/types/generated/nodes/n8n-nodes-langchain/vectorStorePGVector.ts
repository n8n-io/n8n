/**
 * Postgres PGVector Store Node Types
 *
 * Work with your data in Postgresql with the PGVector extension
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstorepgvector/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStorePGVectorV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	/**
	 * The table name to store the vectors in. If table does not exist, it will be created.
	 * @default n8n_vectors
	 */
	tableName?: string | Expression<string>;
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
export type LcVectorStorePGVectorV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	/**
	 * The table name to store the vectors in. If table does not exist, it will be created.
	 * @default n8n_vectors
	 */
	tableName?: string | Expression<string>;
	/**
	 * Number of documents to embed in a single batch
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStorePGVectorV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	/**
	 * The table name to store the vectors in. If table does not exist, it will be created.
	 * @default n8n_vectors
	 */
	tableName?: string | Expression<string>;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStorePGVectorV13RetrieveAsToolConfig = {
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
	/**
	 * The table name to store the vectors in. If table does not exist, it will be created.
	 * @default n8n_vectors
	 */
	tableName?: string | Expression<string>;
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

export type LcVectorStorePGVectorV13Params =
	| LcVectorStorePGVectorV13LoadConfig
	| LcVectorStorePGVectorV13InsertConfig
	| LcVectorStorePGVectorV13RetrieveConfig
	| LcVectorStorePGVectorV13RetrieveAsToolConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStorePGVectorV13Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcVectorStorePGVectorV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStorePGVector';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStorePGVectorV13Params>;
	credentials?: LcVectorStorePGVectorV13Credentials;
};

export type LcVectorStorePGVectorNode = LcVectorStorePGVectorV13Node;
