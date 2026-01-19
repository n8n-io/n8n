/**
 * Simple Vector Store Node - Version 1.2
 * The easiest way to experiment with vector stores, without external setup.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreInMemoryV12LoadConfig = {
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
export type LcVectorStoreInMemoryV12InsertConfig = {
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
export type LcVectorStoreInMemoryV12RetrieveConfig = {
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
export type LcVectorStoreInMemoryV12RetrieveAsToolConfig = {
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


// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreInMemoryV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory';
	version: 1.2;
}

export type LcVectorStoreInMemoryV12LoadNode = LcVectorStoreInMemoryV12NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV12LoadConfig>;
};

export type LcVectorStoreInMemoryV12InsertNode = LcVectorStoreInMemoryV12NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV12InsertConfig>;
};

export type LcVectorStoreInMemoryV12RetrieveNode = LcVectorStoreInMemoryV12NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV12RetrieveConfig>;
};

export type LcVectorStoreInMemoryV12RetrieveAsToolNode = LcVectorStoreInMemoryV12NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV12RetrieveAsToolConfig>;
};

export type LcVectorStoreInMemoryV12Node =
	| LcVectorStoreInMemoryV12LoadNode
	| LcVectorStoreInMemoryV12InsertNode
	| LcVectorStoreInMemoryV12RetrieveNode
	| LcVectorStoreInMemoryV12RetrieveAsToolNode
	;