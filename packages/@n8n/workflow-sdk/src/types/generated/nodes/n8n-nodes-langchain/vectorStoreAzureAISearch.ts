/**
 * Azure AI Search Vector Store Node Types
 *
 * Work with your data in Azure AI Search Vector Store
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstoreazureaisearch/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreAzureAISearchV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	/**
	 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
	 * @default n8n-vectorstore
	 */
	indexName: string | Expression<string>;
	/**
	 * Search prompt to retrieve matching documents from the vector store using similarity-based ranking
	 */
	prompt: string | Expression<string>;
	/**
	 * Number of top results to fetch from vector store
	 * @default 4
	 */
	topK?: number | Expression<number>;
	/**
	 * Whether or not to include document metadata
	 * @default true
	 */
	includeDocumentMetadata?: boolean | Expression<boolean>;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Insert documents into vector store */
export type LcVectorStoreAzureAISearchV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	/**
	 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
	 * @default n8n-vectorstore
	 */
	indexName: string | Expression<string>;
	/**
	 * Number of documents to embed in a single batch
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreAzureAISearchV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	/**
	 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
	 * @default n8n-vectorstore
	 */
	indexName: string | Expression<string>;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreAzureAISearchV13RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
	/**
	 * Name of the vector store
	 */
	toolName: string | Expression<string>;
	/**
	 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
	 */
	toolDescription: string | Expression<string>;
	/**
	 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
	 * @default n8n-vectorstore
	 */
	indexName: string | Expression<string>;
	/**
	 * Number of top results to fetch from vector store
	 * @default 4
	 */
	topK?: number | Expression<number>;
	/**
	 * Whether or not to include document metadata
	 * @default true
	 */
	includeDocumentMetadata?: boolean | Expression<boolean>;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Update documents in vector store by ID */
export type LcVectorStoreAzureAISearchV13UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	/**
	 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
	 * @default n8n-vectorstore
	 */
	indexName: string | Expression<string>;
	/**
	 * ID of an embedding entry
	 */
	id: string | Expression<string>;
};

export type LcVectorStoreAzureAISearchV13Params =
	| LcVectorStoreAzureAISearchV13LoadConfig
	| LcVectorStoreAzureAISearchV13InsertConfig
	| LcVectorStoreAzureAISearchV13RetrieveConfig
	| LcVectorStoreAzureAISearchV13RetrieveAsToolConfig
	| LcVectorStoreAzureAISearchV13UpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreAzureAISearchV13Credentials {
	azureAiSearchApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type LcVectorStoreAzureAISearchV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreAzureAISearch';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreAzureAISearchV13Params>;
	credentials?: LcVectorStoreAzureAISearchV13Credentials;
};

export type LcVectorStoreAzureAISearchNode = LcVectorStoreAzureAISearchV13Node;
