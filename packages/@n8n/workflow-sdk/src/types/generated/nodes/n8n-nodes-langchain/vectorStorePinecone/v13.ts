/**
 * Pinecone Vector Store Node - Version 1.3
 * Work with your data in Pinecone Vector Store
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
/**
 * Number of documents to embed in a single batch
 * @displayOptions.show { mode: ["insert"], @version: [{"_cnd":{"gte":1.1}}] }
 * @default 200
 */
		embeddingBatchSize?: number | Expression<number>;
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
 * Name of the vector store
 * @displayOptions.show { @version: [{"_cnd":{"lte":1.2}}], mode: ["retrieve-as-tool"] }
 */
		toolName: string | Expression<string>;
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

export type LcVectorStorePineconeV13Params =
	| LcVectorStorePineconeV13LoadConfig
	| LcVectorStorePineconeV13InsertConfig
	| LcVectorStorePineconeV13RetrieveConfig
	| LcVectorStorePineconeV13RetrieveAsToolConfig
	| LcVectorStorePineconeV13UpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStorePineconeV13Credentials {
	pineconeApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcVectorStorePineconeV13Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStorePinecone';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStorePineconeV13Params>;
	credentials?: LcVectorStorePineconeV13Credentials;
};