/**
 * Weaviate Vector Store Node - Version 1
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
export type LcVectorStoreWeaviateV1LoadConfig = {
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
export type LcVectorStoreWeaviateV1InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	weaviateCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreWeaviateV1RetrieveConfig = {
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
export type LcVectorStoreWeaviateV1RetrieveAsToolConfig = {
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

export interface LcVectorStoreWeaviateV1Credentials {
	weaviateApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreWeaviateV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreWeaviate';
	version: 1;
	credentials?: LcVectorStoreWeaviateV1Credentials;
}

export type LcVectorStoreWeaviateV1LoadNode = LcVectorStoreWeaviateV1NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV1LoadConfig>;
};

export type LcVectorStoreWeaviateV1InsertNode = LcVectorStoreWeaviateV1NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV1InsertConfig>;
};

export type LcVectorStoreWeaviateV1RetrieveNode = LcVectorStoreWeaviateV1NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV1RetrieveConfig>;
};

export type LcVectorStoreWeaviateV1RetrieveAsToolNode = LcVectorStoreWeaviateV1NodeBase & {
	config: NodeConfig<LcVectorStoreWeaviateV1RetrieveAsToolConfig>;
};

export type LcVectorStoreWeaviateV1Node =
	| LcVectorStoreWeaviateV1LoadNode
	| LcVectorStoreWeaviateV1InsertNode
	| LcVectorStoreWeaviateV1RetrieveNode
	| LcVectorStoreWeaviateV1RetrieveAsToolNode
	;