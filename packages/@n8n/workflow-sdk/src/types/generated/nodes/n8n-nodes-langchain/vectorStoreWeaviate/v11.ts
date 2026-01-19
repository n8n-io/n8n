/**
 * Weaviate Vector Store Node - Version 1.1
 * Work with your data in a Weaviate Cluster
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreWeaviateV11LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	weaviateCollection: ResourceLocatorValue;
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
export type LcVectorStoreWeaviateV11InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	weaviateCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreWeaviateV11RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	weaviateCollection: ResourceLocatorValue;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreWeaviateV11RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	weaviateCollection: ResourceLocatorValue;
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

export interface LcVectorStoreWeaviateV11Credentials {
	weaviateApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreWeaviateV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreWeaviate';
	version: 1.1;
	credentials?: LcVectorStoreWeaviateV11Credentials;
}

export type LcVectorStoreWeaviateV11LoadNode = LcVectorStoreWeaviateV11NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV11LoadConfig>;
};

export type LcVectorStoreWeaviateV11InsertNode = LcVectorStoreWeaviateV11NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV11InsertConfig>;
};

export type LcVectorStoreWeaviateV11RetrieveNode = LcVectorStoreWeaviateV11NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV11RetrieveConfig>;
};

export type LcVectorStoreWeaviateV11RetrieveAsToolNode = LcVectorStoreWeaviateV11NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV11RetrieveAsToolConfig>;
};

export type LcVectorStoreWeaviateV11Node =
	| LcVectorStoreWeaviateV11LoadNode
	| LcVectorStoreWeaviateV11InsertNode
	| LcVectorStoreWeaviateV11RetrieveNode
	| LcVectorStoreWeaviateV11RetrieveAsToolNode
	;