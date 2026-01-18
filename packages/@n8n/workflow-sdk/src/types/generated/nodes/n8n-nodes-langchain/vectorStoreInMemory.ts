/**
 * Simple Vector Store Node Types
 *
 * The easiest way to experiment with vector stores, without external setup.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstoreinmemory/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreInMemoryV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	/**
	 * The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.
	 * @default vector_store_key
	 */
	memoryKey?: string | Expression<string>;
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
export type LcVectorStoreInMemoryV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	/**
	 * The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.
	 * @default vector_store_key
	 */
	memoryKey?: string | Expression<string>;
	/**
	 * Number of documents to embed in a single batch
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
	/**
	 * Whether to clear the store before inserting new data
	 * @default false
	 */
	clearStore?: boolean | Expression<boolean>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreInMemoryV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	/**
	 * The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.
	 * @default vector_store_key
	 */
	memoryKey?: string | Expression<string>;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreInMemoryV13RetrieveAsToolConfig = {
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
	 * The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.
	 * @default vector_store_key
	 */
	memoryKey?: string | Expression<string>;
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

export type LcVectorStoreInMemoryV13Params =
	| LcVectorStoreInMemoryV13LoadConfig
	| LcVectorStoreInMemoryV13InsertConfig
	| LcVectorStoreInMemoryV13RetrieveConfig
	| LcVectorStoreInMemoryV13RetrieveAsToolConfig;

// ===========================================================================
// Node Type
// ===========================================================================

export type LcVectorStoreInMemoryNode = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreInMemoryV13Params>;
	credentials?: Record<string, never>;
};
