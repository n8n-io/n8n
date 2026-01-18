/**
 * Zep Vector Store Node Types
 *
 * Work with your data in Zep Vector Store
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/vectorstorezep/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreZepV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	collectionName: string | Expression<string>;
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
export type LcVectorStoreZepV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	collectionName: string | Expression<string>;
	/**
	 * Number of documents to embed in a single batch
	 * @default 200
	 */
	embeddingBatchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreZepV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	collectionName: string | Expression<string>;
	/**
	 * Whether or not to rerank results
	 * @default false
	 */
	useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreZepV13RetrieveAsToolConfig = {
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
	collectionName: string | Expression<string>;
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

export type LcVectorStoreZepV13Params =
	| LcVectorStoreZepV13LoadConfig
	| LcVectorStoreZepV13InsertConfig
	| LcVectorStoreZepV13RetrieveConfig
	| LcVectorStoreZepV13RetrieveAsToolConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreZepV13Credentials {
	zepApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcVectorStoreZepNode = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreZep';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcVectorStoreZepV13Params>;
	credentials?: LcVectorStoreZepV13Credentials;
};
