/**
 * Pinecone Vector Store Node - Version 1.1
 * Work with your data in Pinecone Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStorePineconeV11LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
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
export type LcVectorStorePineconeV11InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStorePineconeV11RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStorePineconeV11RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	pineconeIndex: ResourceLocatorValue;
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
export type LcVectorStorePineconeV11UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStorePineconeV11Credentials {
	pineconeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStorePineconeV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStorePinecone';
	version: 1.1;
	credentials?: LcVectorStorePineconeV11Credentials;
}

export type LcVectorStorePineconeV11LoadNode = LcVectorStorePineconeV11NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV11LoadConfig>;
};

export type LcVectorStorePineconeV11InsertNode = LcVectorStorePineconeV11NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV11InsertConfig>;
};

export type LcVectorStorePineconeV11RetrieveNode = LcVectorStorePineconeV11NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV11RetrieveConfig>;
};

export type LcVectorStorePineconeV11RetrieveAsToolNode = LcVectorStorePineconeV11NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV11RetrieveAsToolConfig>;
};

export type LcVectorStorePineconeV11UpdateNode = LcVectorStorePineconeV11NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV11UpdateConfig>;
};

export type LcVectorStorePineconeV11Node =
	| LcVectorStorePineconeV11LoadNode
	| LcVectorStorePineconeV11InsertNode
	| LcVectorStorePineconeV11RetrieveNode
	| LcVectorStorePineconeV11RetrieveAsToolNode
	| LcVectorStorePineconeV11UpdateNode
	;