/**
 * Supabase Vector Store Node - Version 1.2
 * Work with your data in Supabase Vector Store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreSupabaseV12LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	tableName: ResourceLocatorValue;
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
export type LcVectorStoreSupabaseV12InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	tableName: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreSupabaseV12RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	tableName: ResourceLocatorValue;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreSupabaseV12RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	tableName: ResourceLocatorValue;
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
export type LcVectorStoreSupabaseV12UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	tableName: ResourceLocatorValue;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreSupabaseV12Credentials {
	supabaseApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreSupabaseV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase';
	version: 1.2;
	credentials?: LcVectorStoreSupabaseV12Credentials;
}

export type LcVectorStoreSupabaseV12LoadNode = LcVectorStoreSupabaseV12NodeBase & {
	config: NodeConfig<LcVectorStoreSupabaseV12LoadConfig>;
};

export type LcVectorStoreSupabaseV12InsertNode = LcVectorStoreSupabaseV12NodeBase & {
	config: NodeConfig<LcVectorStoreSupabaseV12InsertConfig>;
};

export type LcVectorStoreSupabaseV12RetrieveNode = LcVectorStoreSupabaseV12NodeBase & {
	config: NodeConfig<LcVectorStoreSupabaseV12RetrieveConfig>;
};

export type LcVectorStoreSupabaseV12RetrieveAsToolNode = LcVectorStoreSupabaseV12NodeBase & {
	config: NodeConfig<LcVectorStoreSupabaseV12RetrieveAsToolConfig>;
};

export type LcVectorStoreSupabaseV12UpdateNode = LcVectorStoreSupabaseV12NodeBase & {
	config: NodeConfig<LcVectorStoreSupabaseV12UpdateConfig>;
};

export type LcVectorStoreSupabaseV12Node =
	| LcVectorStoreSupabaseV12LoadNode
	| LcVectorStoreSupabaseV12InsertNode
	| LcVectorStoreSupabaseV12RetrieveNode
	| LcVectorStoreSupabaseV12RetrieveAsToolNode
	| LcVectorStoreSupabaseV12UpdateNode
	;