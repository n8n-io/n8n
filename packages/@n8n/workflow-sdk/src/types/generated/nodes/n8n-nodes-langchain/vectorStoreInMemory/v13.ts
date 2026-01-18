/**
 * Simple Vector Store Node - Version 1.3
 * The easiest way to experiment with vector stores, without external setup.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { @version: [{"_cnd":{"lte":1.1}}] }
 * @default vector_store_key
 */
		memoryKey?: string | Expression<string>;
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
};

/** Insert documents into vector store */
export type LcVectorStoreInMemoryV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
/**
 * The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.
 * @displayOptions.show { @version: [{"_cnd":{"lte":1.1}}] }
 * @default vector_store_key
 */
		memoryKey?: string | Expression<string>;
/**
 * Number of documents to embed in a single batch
 * @displayOptions.show { mode: ["insert"], @version: [{"_cnd":{"gte":1.1}}] }
 * @default 200
 */
		embeddingBatchSize?: number | Expression<number>;
/**
 * Whether to clear the store before inserting new data
 * @displayOptions.show { mode: ["insert"] }
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
 * @displayOptions.show { @version: [{"_cnd":{"lte":1.1}}] }
 * @default vector_store_key
 */
		memoryKey?: string | Expression<string>;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
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
 * @displayOptions.show { @version: [{"_cnd":{"lte":1.2}}], mode: ["retrieve-as-tool"] }
 */
		toolName: string | Expression<string>;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
/**
 * The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.
 * @displayOptions.show { @version: [{"_cnd":{"lte":1.1}}] }
 * @default vector_store_key
 */
		memoryKey?: string | Expression<string>;
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
};

export type LcVectorStoreInMemoryV13Params =
	| LcVectorStoreInMemoryV13LoadConfig
	| LcVectorStoreInMemoryV13InsertConfig
	| LcVectorStoreInMemoryV13RetrieveConfig
	| LcVectorStoreInMemoryV13RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcVectorStoreInMemoryV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreInMemoryV13Params>;
	credentials?: Record<string, never>;
};