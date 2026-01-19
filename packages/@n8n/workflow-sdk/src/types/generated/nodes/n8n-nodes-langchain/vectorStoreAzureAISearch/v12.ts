/**
 * Azure AI Search Vector Store Node - Version 1.2
 * Work with your data in Azure AI Search Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreAzureAISearchV12LoadConfig = {
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
export type LcVectorStoreAzureAISearchV12InsertConfig = {
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
export type LcVectorStoreAzureAISearchV12RetrieveConfig = {
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
export type LcVectorStoreAzureAISearchV12RetrieveAsToolConfig = {
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
export type LcVectorStoreAzureAISearchV12UpdateConfig = {
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreAzureAISearchV12Credentials {
	azureAiSearchApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreAzureAISearchV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreAzureAISearch';
	version: 1.2;
	credentials?: LcVectorStoreAzureAISearchV12Credentials;
}

export type LcVectorStoreAzureAISearchV12LoadNode = LcVectorStoreAzureAISearchV12NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV12LoadConfig>;
};

export type LcVectorStoreAzureAISearchV12InsertNode = LcVectorStoreAzureAISearchV12NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV12InsertConfig>;
};

export type LcVectorStoreAzureAISearchV12RetrieveNode = LcVectorStoreAzureAISearchV12NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV12RetrieveConfig>;
};

export type LcVectorStoreAzureAISearchV12RetrieveAsToolNode = LcVectorStoreAzureAISearchV12NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV12RetrieveAsToolConfig>;
};

export type LcVectorStoreAzureAISearchV12UpdateNode = LcVectorStoreAzureAISearchV12NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV12UpdateConfig>;
};

export type LcVectorStoreAzureAISearchV12Node =
	| LcVectorStoreAzureAISearchV12LoadNode
	| LcVectorStoreAzureAISearchV12InsertNode
	| LcVectorStoreAzureAISearchV12RetrieveNode
	| LcVectorStoreAzureAISearchV12RetrieveAsToolNode
	| LcVectorStoreAzureAISearchV12UpdateNode
	;