/**
 * Azure AI Search Vector Store Node - Version 1.3
 * Work with your data in Azure AI Search Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
export type LcVectorStoreAzureAISearchV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
/**
 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
 * @default n8n-vectorstore
 */
		indexName: string | Expression<string>;
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
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
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
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
/**
 * The name of the Azure AI Search index. Will be created automatically if it does not exist.
 * @default n8n-vectorstore
 */
		indexName: string | Expression<string>;
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
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};

export type LcVectorStoreAzureAISearchV13Params =
	| LcVectorStoreAzureAISearchV13LoadConfig
	| LcVectorStoreAzureAISearchV13InsertConfig
	| LcVectorStoreAzureAISearchV13RetrieveConfig
	| LcVectorStoreAzureAISearchV13RetrieveAsToolConfig
	| LcVectorStoreAzureAISearchV13UpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreAzureAISearchV13Credentials {
	azureAiSearchApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreAzureAISearchV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreAzureAISearch';
	version: 1.3;
	credentials?: LcVectorStoreAzureAISearchV13Credentials;
}

export type LcVectorStoreAzureAISearchV13LoadNode = LcVectorStoreAzureAISearchV13NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV13LoadConfig>;
};

export type LcVectorStoreAzureAISearchV13InsertNode = LcVectorStoreAzureAISearchV13NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV13InsertConfig>;
};

export type LcVectorStoreAzureAISearchV13RetrieveNode = LcVectorStoreAzureAISearchV13NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV13RetrieveConfig>;
};

export type LcVectorStoreAzureAISearchV13RetrieveAsToolNode = LcVectorStoreAzureAISearchV13NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV13RetrieveAsToolConfig>;
};

export type LcVectorStoreAzureAISearchV13UpdateNode = LcVectorStoreAzureAISearchV13NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV13UpdateConfig>;
};

export type LcVectorStoreAzureAISearchV13Node =
	| LcVectorStoreAzureAISearchV13LoadNode
	| LcVectorStoreAzureAISearchV13InsertNode
	| LcVectorStoreAzureAISearchV13RetrieveNode
	| LcVectorStoreAzureAISearchV13RetrieveAsToolNode
	| LcVectorStoreAzureAISearchV13UpdateNode
	;