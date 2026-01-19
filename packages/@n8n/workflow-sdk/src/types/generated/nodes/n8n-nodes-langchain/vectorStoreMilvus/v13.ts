/**
 * Milvus Vector Store Node - Version 1.3
 * Work with your data in Milvus Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreMilvusV13LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
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
};

/** Insert documents into vector store */
export type LcVectorStoreMilvusV13InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreMilvusV13RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreMilvusV13RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	milvusCollection: ResourceLocatorValue;
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
};

export type LcVectorStoreMilvusV13Params =
	| LcVectorStoreMilvusV13LoadConfig
	| LcVectorStoreMilvusV13InsertConfig
	| LcVectorStoreMilvusV13RetrieveConfig
	| LcVectorStoreMilvusV13RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreMilvusV13Credentials {
	milvusApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreMilvusV13NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMilvus';
	version: 1.3;
	credentials?: LcVectorStoreMilvusV13Credentials;
}

export type LcVectorStoreMilvusV13LoadNode = LcVectorStoreMilvusV13NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV13LoadConfig>;
};

export type LcVectorStoreMilvusV13InsertNode = LcVectorStoreMilvusV13NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV13InsertConfig>;
};

export type LcVectorStoreMilvusV13RetrieveNode = LcVectorStoreMilvusV13NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV13RetrieveConfig>;
};

export type LcVectorStoreMilvusV13RetrieveAsToolNode = LcVectorStoreMilvusV13NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV13RetrieveAsToolConfig>;
};

export type LcVectorStoreMilvusV13Node =
	| LcVectorStoreMilvusV13LoadNode
	| LcVectorStoreMilvusV13InsertNode
	| LcVectorStoreMilvusV13RetrieveNode
	| LcVectorStoreMilvusV13RetrieveAsToolNode
	;