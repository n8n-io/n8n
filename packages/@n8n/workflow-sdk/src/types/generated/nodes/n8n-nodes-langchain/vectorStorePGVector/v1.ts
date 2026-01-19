/**
 * Postgres PGVector Store Node - Version 1
 * Work with your data in Postgresql with the PGVector extension
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStorePGVectorV1LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
/**
 * The table name to store the vectors in. If table does not exist, it will be created.
 * @default n8n_vectors
 */
		tableName?: string | Expression<string>;
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
export type LcVectorStorePGVectorV1InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
/**
 * The table name to store the vectors in. If table does not exist, it will be created.
 * @default n8n_vectors
 */
		tableName?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStorePGVectorV1RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
/**
 * The table name to store the vectors in. If table does not exist, it will be created.
 * @default n8n_vectors
 */
		tableName?: string | Expression<string>;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStorePGVectorV1RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
/**
 * The table name to store the vectors in. If table does not exist, it will be created.
 * @default n8n_vectors
 */
		tableName?: string | Expression<string>;
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

export type LcVectorStorePGVectorV1Params =
	| LcVectorStorePGVectorV1LoadConfig
	| LcVectorStorePGVectorV1InsertConfig
	| LcVectorStorePGVectorV1RetrieveConfig
	| LcVectorStorePGVectorV1RetrieveAsToolConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStorePGVectorV1Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStorePGVectorV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStorePGVector';
	version: 1;
	credentials?: LcVectorStorePGVectorV1Credentials;
}

export type LcVectorStorePGVectorV1LoadNode = LcVectorStorePGVectorV1NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV1LoadConfig>;
};

export type LcVectorStorePGVectorV1InsertNode = LcVectorStorePGVectorV1NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV1InsertConfig>;
};

export type LcVectorStorePGVectorV1RetrieveNode = LcVectorStorePGVectorV1NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV1RetrieveConfig>;
};

export type LcVectorStorePGVectorV1RetrieveAsToolNode = LcVectorStorePGVectorV1NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV1RetrieveAsToolConfig>;
};

export type LcVectorStorePGVectorV1Node =
	| LcVectorStorePGVectorV1LoadNode
	| LcVectorStorePGVectorV1InsertNode
	| LcVectorStorePGVectorV1RetrieveNode
	| LcVectorStorePGVectorV1RetrieveAsToolNode
	;