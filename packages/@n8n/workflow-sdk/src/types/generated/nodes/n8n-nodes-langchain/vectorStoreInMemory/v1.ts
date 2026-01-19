/**
 * Simple Vector Store Node - Version 1
 * The easiest way to experiment with vector stores, without external setup.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreInMemoryV1LoadConfig = {
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
export type LcVectorStoreInMemoryV1InsertConfig = {
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
export type LcVectorStoreInMemoryV1RetrieveConfig = {
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
export type LcVectorStoreInMemoryV1RetrieveAsToolConfig = {
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

export type LcVectorStoreInMemoryV1Params =
	| LcVectorStoreInMemoryV1LoadConfig
	| LcVectorStoreInMemoryV1InsertConfig
	| LcVectorStoreInMemoryV1RetrieveConfig
	| LcVectorStoreInMemoryV1RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreInMemoryV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory';
	version: 1;
}

export type LcVectorStoreInMemoryV1LoadNode = LcVectorStoreInMemoryV1NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV1LoadConfig>;
};

export type LcVectorStoreInMemoryV1InsertNode = LcVectorStoreInMemoryV1NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV1InsertConfig>;
};

export type LcVectorStoreInMemoryV1RetrieveNode = LcVectorStoreInMemoryV1NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV1RetrieveConfig>;
};

export type LcVectorStoreInMemoryV1RetrieveAsToolNode = LcVectorStoreInMemoryV1NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV1RetrieveAsToolConfig>;
};

export type LcVectorStoreInMemoryV1Node =
	| LcVectorStoreInMemoryV1LoadNode
	| LcVectorStoreInMemoryV1InsertNode
	| LcVectorStoreInMemoryV1RetrieveNode
	| LcVectorStoreInMemoryV1RetrieveAsToolNode
	;