/**
 * Milvus Vector Store Node - Version 1
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
export type LcVectorStoreMilvusV1LoadConfig = {
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
export type LcVectorStoreMilvusV1InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	milvusCollection: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreMilvusV1RetrieveConfig = {
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
export type LcVectorStoreMilvusV1RetrieveAsToolConfig = {
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

export type LcVectorStoreMilvusV1Params =
	| LcVectorStoreMilvusV1LoadConfig
	| LcVectorStoreMilvusV1InsertConfig
	| LcVectorStoreMilvusV1RetrieveConfig
	| LcVectorStoreMilvusV1RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreMilvusV1Credentials {
	milvusApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreMilvusV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreMilvus';
	version: 1;
	credentials?: LcVectorStoreMilvusV1Credentials;
}

export type LcVectorStoreMilvusV1LoadNode = LcVectorStoreMilvusV1NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV1LoadConfig>;
};

export type LcVectorStoreMilvusV1InsertNode = LcVectorStoreMilvusV1NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV1InsertConfig>;
};

export type LcVectorStoreMilvusV1RetrieveNode = LcVectorStoreMilvusV1NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV1RetrieveConfig>;
};

export type LcVectorStoreMilvusV1RetrieveAsToolNode = LcVectorStoreMilvusV1NodeBase & {
	config: NodeConfig<LcVectorStoreMilvusV1RetrieveAsToolConfig>;
};

export type LcVectorStoreMilvusV1Node =
	| LcVectorStoreMilvusV1LoadNode
	| LcVectorStoreMilvusV1InsertNode
	| LcVectorStoreMilvusV1RetrieveNode
	| LcVectorStoreMilvusV1RetrieveAsToolNode
	;