/**
 * Supabase Vector Store Node - Version 1.2
 * Work with your data in Supabase Vector Store
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

export type LcVectorStoreSupabaseV12Params =
	| LcVectorStoreSupabaseV12LoadConfig
	| LcVectorStoreSupabaseV12InsertConfig
	| LcVectorStoreSupabaseV12RetrieveConfig
	| LcVectorStoreSupabaseV12RetrieveAsToolConfig
	| LcVectorStoreSupabaseV12UpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreSupabaseV12Credentials {
	supabaseApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcVectorStoreSupabaseV12Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase';
	version: 1.2;
	config: NodeConfig<LcVectorStoreSupabaseV12Params>;
	credentials?: LcVectorStoreSupabaseV12Credentials;
};