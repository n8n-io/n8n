/**
 * Simple Vector Store Node - Version 1.1
 * The easiest way to experiment with vector stores, without external setup.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreInMemoryV11LoadConfig = {
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
export type LcVectorStoreInMemoryV11InsertConfig = {
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
export type LcVectorStoreInMemoryV11RetrieveConfig = {
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
export type LcVectorStoreInMemoryV11RetrieveAsToolConfig = {
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

interface LcVectorStoreInMemoryV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory';
	version: 1.1;
}

export type LcVectorStoreInMemoryV11LoadNode = LcVectorStoreInMemoryV11NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV11LoadConfig>;
};

export type LcVectorStoreInMemoryV11InsertNode = LcVectorStoreInMemoryV11NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV11InsertConfig>;
};

export type LcVectorStoreInMemoryV11RetrieveNode = LcVectorStoreInMemoryV11NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV11RetrieveConfig>;
};

export type LcVectorStoreInMemoryV11RetrieveAsToolNode = LcVectorStoreInMemoryV11NodeBase & {
	config: NodeConfig<LcVectorStoreInMemoryV11RetrieveAsToolConfig>;
};

export type LcVectorStoreInMemoryV11Node =
	| LcVectorStoreInMemoryV11LoadNode
	| LcVectorStoreInMemoryV11InsertNode
	| LcVectorStoreInMemoryV11RetrieveNode
	| LcVectorStoreInMemoryV11RetrieveAsToolNode
	;