/**
 * Pinecone Vector Store Node - Version 1.3
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
export type LcVectorStorePineconeV13LoadConfig = {
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
export type LcVectorStorePineconeV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStorePineconeV13RetrieveConfig = {
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
export type LcVectorStorePineconeV13RetrieveAsToolConfig = {
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
export type LcVectorStorePineconeV13UpdateConfig = {
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

export interface LcVectorStorePineconeV13Credentials {
	pineconeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStorePineconeV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStorePinecone';
	version: 1.3;
	credentials?: LcVectorStorePineconeV13Credentials;
}

export type LcVectorStorePineconeV13LoadNode = LcVectorStorePineconeV13NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV13LoadConfig>;
};

export type LcVectorStorePineconeV13InsertNode = LcVectorStorePineconeV13NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV13InsertConfig>;
};

export type LcVectorStorePineconeV13RetrieveNode = LcVectorStorePineconeV13NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV13RetrieveConfig>;
};

export type LcVectorStorePineconeV13RetrieveAsToolNode = LcVectorStorePineconeV13NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV13RetrieveAsToolConfig>;
};

export type LcVectorStorePineconeV13UpdateNode = LcVectorStorePineconeV13NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV13UpdateConfig>;
};

export type LcVectorStorePineconeV13Node =
	| LcVectorStorePineconeV13LoadNode
	| LcVectorStorePineconeV13InsertNode
	| LcVectorStorePineconeV13RetrieveNode
	| LcVectorStorePineconeV13RetrieveAsToolNode
	| LcVectorStorePineconeV13UpdateNode
	;