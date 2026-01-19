/**
 * Qdrant Vector Store Node - Version 1.3
 * Work with your data in a Qdrant collection
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreQdrantV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	qdrantCollection: ResourceLocatorValue;
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
export type LcVectorStoreQdrantV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	qdrantCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreQdrantV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	qdrantCollection: ResourceLocatorValue;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreQdrantV13RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	qdrantCollection: ResourceLocatorValue;
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

export interface LcVectorStoreQdrantV13Credentials {
	qdrantApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreQdrantV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant';
	version: 1.3;
	credentials?: LcVectorStoreQdrantV13Credentials;
}

export type LcVectorStoreQdrantV13LoadNode = LcVectorStoreQdrantV13NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV13LoadConfig>;
};

export type LcVectorStoreQdrantV13InsertNode = LcVectorStoreQdrantV13NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV13InsertConfig>;
};

export type LcVectorStoreQdrantV13RetrieveNode = LcVectorStoreQdrantV13NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV13RetrieveConfig>;
};

export type LcVectorStoreQdrantV13RetrieveAsToolNode = LcVectorStoreQdrantV13NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV13RetrieveAsToolConfig>;
};

export type LcVectorStoreQdrantV13Node =
	| LcVectorStoreQdrantV13LoadNode
	| LcVectorStoreQdrantV13InsertNode
	| LcVectorStoreQdrantV13RetrieveNode
	| LcVectorStoreQdrantV13RetrieveAsToolNode
	;