/**
 * Azure AI Search Vector Store Node - Version 1.1
 * Work with your data in Azure AI Search Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreAzureAISearchV11LoadConfig = {
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
export type LcVectorStoreAzureAISearchV11InsertConfig = {
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
export type LcVectorStoreAzureAISearchV11RetrieveConfig = {
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
export type LcVectorStoreAzureAISearchV11RetrieveAsToolConfig = {
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
export type LcVectorStoreAzureAISearchV11UpdateConfig = {
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

export interface LcVectorStoreAzureAISearchV11Credentials {
	azureAiSearchApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreAzureAISearchV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreAzureAISearch';
	version: 1.1;
	credentials?: LcVectorStoreAzureAISearchV11Credentials;
}

export type LcVectorStoreAzureAISearchV11LoadNode = LcVectorStoreAzureAISearchV11NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV11LoadConfig>;
};

export type LcVectorStoreAzureAISearchV11InsertNode = LcVectorStoreAzureAISearchV11NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV11InsertConfig>;
};

export type LcVectorStoreAzureAISearchV11RetrieveNode = LcVectorStoreAzureAISearchV11NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV11RetrieveConfig>;
};

export type LcVectorStoreAzureAISearchV11RetrieveAsToolNode = LcVectorStoreAzureAISearchV11NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV11RetrieveAsToolConfig>;
};

export type LcVectorStoreAzureAISearchV11UpdateNode = LcVectorStoreAzureAISearchV11NodeBase & {
	config: NodeConfig<LcVectorStoreAzureAISearchV11UpdateConfig>;
};

export type LcVectorStoreAzureAISearchV11Node =
	| LcVectorStoreAzureAISearchV11LoadNode
	| LcVectorStoreAzureAISearchV11InsertNode
	| LcVectorStoreAzureAISearchV11RetrieveNode
	| LcVectorStoreAzureAISearchV11RetrieveAsToolNode
	| LcVectorStoreAzureAISearchV11UpdateNode
	;