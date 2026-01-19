/**
 * Qdrant Vector Store Node - Version 1
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
export type LcVectorStoreQdrantV1LoadConfig = {
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
export type LcVectorStoreQdrantV1InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	qdrantCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreQdrantV1RetrieveConfig = {
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
export type LcVectorStoreQdrantV1RetrieveAsToolConfig = {
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

export interface LcVectorStoreQdrantV1Credentials {
	qdrantApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreQdrantV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant';
	version: 1;
	credentials?: LcVectorStoreQdrantV1Credentials;
}

export type LcVectorStoreQdrantV1LoadNode = LcVectorStoreQdrantV1NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV1LoadConfig>;
};

export type LcVectorStoreQdrantV1InsertNode = LcVectorStoreQdrantV1NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV1InsertConfig>;
};

export type LcVectorStoreQdrantV1RetrieveNode = LcVectorStoreQdrantV1NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV1RetrieveConfig>;
};

export type LcVectorStoreQdrantV1RetrieveAsToolNode = LcVectorStoreQdrantV1NodeBase & {
	config: NodeConfig<LcVectorStoreQdrantV1RetrieveAsToolConfig>;
};

export type LcVectorStoreQdrantV1Node =
	| LcVectorStoreQdrantV1LoadNode
	| LcVectorStoreQdrantV1InsertNode
	| LcVectorStoreQdrantV1RetrieveNode
	| LcVectorStoreQdrantV1RetrieveAsToolNode
	;