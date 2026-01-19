/**
 * Qdrant Vector Store Node - Version 1.2
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
export type LcVectorStoreQdrantV12LoadConfig = {
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
export type LcVectorStoreQdrantV12InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	qdrantCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreQdrantV12RetrieveConfig = {
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
export type LcVectorStoreQdrantV12RetrieveAsToolConfig = {
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

export type LcVectorStoreQdrantV12Params =
	| LcVectorStoreQdrantV12LoadConfig
	| LcVectorStoreQdrantV12InsertConfig
	| LcVectorStoreQdrantV12RetrieveConfig
	| LcVectorStoreQdrantV12RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreQdrantV12Credentials {
	qdrantApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreQdrantV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant';
	version: 1.2;
	credentials?: LcVectorStoreQdrantV12Credentials;
}

export type LcVectorStoreQdrantV12LoadNode = LcVectorStoreQdrantV12NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV12LoadConfig>;
};

export type LcVectorStoreQdrantV12InsertNode = LcVectorStoreQdrantV12NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV12InsertConfig>;
};

export type LcVectorStoreQdrantV12RetrieveNode = LcVectorStoreQdrantV12NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV12RetrieveConfig>;
};

export type LcVectorStoreQdrantV12RetrieveAsToolNode = LcVectorStoreQdrantV12NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV12RetrieveAsToolConfig>;
};

export type LcVectorStoreQdrantV12Node =
	| LcVectorStoreQdrantV12LoadNode
	| LcVectorStoreQdrantV12InsertNode
	| LcVectorStoreQdrantV12RetrieveNode
	| LcVectorStoreQdrantV12RetrieveAsToolNode
	;