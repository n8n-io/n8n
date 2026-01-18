/**
 * Milvus Vector Store Node Types
 *
 * Work with your data in Milvus Vector Store
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstoremilvus/
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
export type LcVectorStoreMilvusV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
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
};

/** Insert documents into vector store */
export type LcVectorStoreMilvusV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
	/**
	 * Number of documents to embed in a single batch
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreMilvusV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreMilvusV13RetrieveAsToolConfig = {
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
	milvusCollection: ResourceLocatorValue;
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
};

export type LcVectorStoreMilvusV13Params =
	| LcVectorStoreMilvusV13LoadConfig
	| LcVectorStoreMilvusV13InsertConfig
	| LcVectorStoreMilvusV13RetrieveConfig
	| LcVectorStoreMilvusV13RetrieveAsToolConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreMilvusV13Credentials {
	milvusApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcVectorStoreMilvusV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMilvus';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreMilvusV13Params>;
	credentials?: LcVectorStoreMilvusV13Credentials;
};

export type LcVectorStoreMilvusNode = LcVectorStoreMilvusV13Node;
