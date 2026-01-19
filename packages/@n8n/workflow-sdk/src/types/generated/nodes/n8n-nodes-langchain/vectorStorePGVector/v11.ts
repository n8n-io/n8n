/**
 * Postgres PGVector Store Node - Version 1.1
 * Work with your data in Postgresql with the PGVector extension
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStorePGVectorV11LoadConfig = {
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
export type LcVectorStorePGVectorV11InsertConfig = {
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
export type LcVectorStorePGVectorV11RetrieveConfig = {
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
export type LcVectorStorePGVectorV11RetrieveAsToolConfig = {
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStorePGVectorV11Credentials {
	postgres: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStorePGVectorV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStorePGVector';
	version: 1.1;
	credentials?: LcVectorStorePGVectorV11Credentials;
}

export type LcVectorStorePGVectorV11LoadNode = LcVectorStorePGVectorV11NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV11LoadConfig>;
};

export type LcVectorStorePGVectorV11InsertNode = LcVectorStorePGVectorV11NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV11InsertConfig>;
};

export type LcVectorStorePGVectorV11RetrieveNode = LcVectorStorePGVectorV11NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV11RetrieveConfig>;
};

export type LcVectorStorePGVectorV11RetrieveAsToolNode = LcVectorStorePGVectorV11NodeBase & {
	config: NodeConfig<LcVectorStorePGVectorV11RetrieveAsToolConfig>;
};

export type LcVectorStorePGVectorV11Node =
	| LcVectorStorePGVectorV11LoadNode
	| LcVectorStorePGVectorV11InsertNode
	| LcVectorStorePGVectorV11RetrieveNode
	| LcVectorStorePGVectorV11RetrieveAsToolNode
	;