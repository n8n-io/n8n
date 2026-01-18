/**
 * Weaviate Vector Store Node Types
 *
 * Work with your data in a Weaviate Cluster
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstoreweaviate/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreWeaviateV13LoadConfig = {
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
export type LcVectorStoreWeaviateV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	weaviateCollection: ResourceLocatorValue;
	/**
	 * Number of documents to embed in a single batch
	 * @displayOptions.show { mode: ["insert"], @version: [{"_cnd":{"gte":1.1}}] }
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreWeaviateV13RetrieveConfig = {
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
export type LcVectorStoreWeaviateV13RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
	/**
	 * Name of the vector store
	 * @displayOptions.show { @version: [{"_cnd":{"lte":1.2}}], mode: ["retrieve-as-tool"] }
	 */
	toolName: string | Expression<string>;
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

export type LcVectorStoreWeaviateV13Params =
	| LcVectorStoreWeaviateV13LoadConfig
	| LcVectorStoreWeaviateV13InsertConfig
	| LcVectorStoreWeaviateV13RetrieveConfig
	| LcVectorStoreWeaviateV13RetrieveAsToolConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreWeaviateV13Credentials {
	weaviateApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcVectorStoreWeaviateV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreWeaviate';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreWeaviateV13Params>;
	credentials?: LcVectorStoreWeaviateV13Credentials;
};

export type LcVectorStoreWeaviateNode = LcVectorStoreWeaviateV13Node;
