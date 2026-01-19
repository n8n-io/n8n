/**
 * Pinecone Vector Store Node - Version 1
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
export type LcVectorStorePineconeV1LoadConfig = {
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
export type LcVectorStorePineconeV1InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStorePineconeV1RetrieveConfig = {
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
export type LcVectorStorePineconeV1RetrieveAsToolConfig = {
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
export type LcVectorStorePineconeV1UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	pineconeIndex: ResourceLocatorValue;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};

export type LcVectorStorePineconeV1Params =
	| LcVectorStorePineconeV1LoadConfig
	| LcVectorStorePineconeV1InsertConfig
	| LcVectorStorePineconeV1RetrieveConfig
	| LcVectorStorePineconeV1RetrieveAsToolConfig
	| LcVectorStorePineconeV1UpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStorePineconeV1Credentials {
	pineconeApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStorePineconeV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStorePinecone';
	version: 1;
	credentials?: LcVectorStorePineconeV1Credentials;
}

export type LcVectorStorePineconeV1LoadNode = LcVectorStorePineconeV1NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV1LoadConfig>;
};

export type LcVectorStorePineconeV1InsertNode = LcVectorStorePineconeV1NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV1InsertConfig>;
};

export type LcVectorStorePineconeV1RetrieveNode = LcVectorStorePineconeV1NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV1RetrieveConfig>;
};

export type LcVectorStorePineconeV1RetrieveAsToolNode = LcVectorStorePineconeV1NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV1RetrieveAsToolConfig>;
};

export type LcVectorStorePineconeV1UpdateNode = LcVectorStorePineconeV1NodeBase & {
	config: NodeConfig<LcVectorStorePineconeV1UpdateConfig>;
};

export type LcVectorStorePineconeV1Node =
	| LcVectorStorePineconeV1LoadNode
	| LcVectorStorePineconeV1InsertNode
	| LcVectorStorePineconeV1RetrieveNode
	| LcVectorStorePineconeV1RetrieveAsToolNode
	| LcVectorStorePineconeV1UpdateNode
	;