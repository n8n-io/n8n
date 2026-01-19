/**
 * Milvus Vector Store Node - Version 1.1
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
export type LcVectorStoreMilvusV11LoadConfig = {
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
export type LcVectorStoreMilvusV11InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreMilvusV11RetrieveConfig = {
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
export type LcVectorStoreMilvusV11RetrieveAsToolConfig = {
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

export type LcVectorStoreMilvusV11Params =
	| LcVectorStoreMilvusV11LoadConfig
	| LcVectorStoreMilvusV11InsertConfig
	| LcVectorStoreMilvusV11RetrieveConfig
	| LcVectorStoreMilvusV11RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreMilvusV11Credentials {
	milvusApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreMilvusV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMilvus';
	version: 1.1;
	credentials?: LcVectorStoreMilvusV11Credentials;
}

export type LcVectorStoreMilvusV11LoadNode = LcVectorStoreMilvusV11NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV11LoadConfig>;
};

export type LcVectorStoreMilvusV11InsertNode = LcVectorStoreMilvusV11NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV11InsertConfig>;
};

export type LcVectorStoreMilvusV11RetrieveNode = LcVectorStoreMilvusV11NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV11RetrieveConfig>;
};

export type LcVectorStoreMilvusV11RetrieveAsToolNode = LcVectorStoreMilvusV11NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV11RetrieveAsToolConfig>;
};

export type LcVectorStoreMilvusV11Node =
	| LcVectorStoreMilvusV11LoadNode
	| LcVectorStoreMilvusV11InsertNode
	| LcVectorStoreMilvusV11RetrieveNode
	| LcVectorStoreMilvusV11RetrieveAsToolNode
	;