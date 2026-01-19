/**
 * Zep Vector Store Node - Version 1.2
 * Work with your data in Zep Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreZepV12LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	collectionName: string | Expression<string>;
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
export type LcVectorStoreZepV12InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	collectionName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreZepV12RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	collectionName: string | Expression<string>;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreZepV12RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	collectionName: string | Expression<string>;
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreZepV12Credentials {
	zepApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreZepV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreZep';
	version: 1.2;
	credentials?: LcVectorStoreZepV12Credentials;
}

export type LcVectorStoreZepV12LoadNode = LcVectorStoreZepV12NodeBase & {
	config: NodeConfig<LcVectorStoreZepV12LoadConfig>;
};

export type LcVectorStoreZepV12InsertNode = LcVectorStoreZepV12NodeBase & {
	config: NodeConfig<LcVectorStoreZepV12InsertConfig>;
};

export type LcVectorStoreZepV12RetrieveNode = LcVectorStoreZepV12NodeBase & {
	config: NodeConfig<LcVectorStoreZepV12RetrieveConfig>;
};

export type LcVectorStoreZepV12RetrieveAsToolNode = LcVectorStoreZepV12NodeBase & {
	config: NodeConfig<LcVectorStoreZepV12RetrieveAsToolConfig>;
};

export type LcVectorStoreZepV12Node =
	| LcVectorStoreZepV12LoadNode
	| LcVectorStoreZepV12InsertNode
	| LcVectorStoreZepV12RetrieveNode
	| LcVectorStoreZepV12RetrieveAsToolNode
	;