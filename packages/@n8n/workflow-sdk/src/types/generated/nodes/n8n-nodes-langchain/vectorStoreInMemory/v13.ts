/**
 * Simple Vector Store Node - Version 1.3
 * The easiest way to experiment with vector stores, without external setup.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreInMemoryV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
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
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
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
	version: 1.3;
	config: NodeConfig<LcVectorStoreInMemoryV13Params>;
	credentials?: Record<string, never>;
};