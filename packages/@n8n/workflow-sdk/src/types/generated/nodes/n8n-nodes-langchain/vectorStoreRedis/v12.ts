/**
 * Redis Vector Store Node - Version 1.2
 * Work with your data in a Redis vector index
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
export type LcVectorStoreRedisV12LoadConfig = {
	mode: 'load';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
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
export type LcVectorStoreRedisV12InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreRedisV12RetrieveConfig = {
	mode: 'retrieve';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
/**
 * Whether or not to rerank results
 * @displayOptions.show { mode: ["load", "retrieve", "retrieve-as-tool"] }
 * @default false
 */
		useReranker?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as tool with AI nodes */
export type LcVectorStoreRedisV12RetrieveAsToolConfig = {
	mode: 'retrieve-as-tool';
	ragStarterCallout?: unknown;
/**
 * Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often
 * @displayOptions.show { mode: ["retrieve-as-tool"] }
 */
		toolDescription: string | Expression<string>;
	redisIndex: ResourceLocatorValue;
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
export type LcVectorStoreRedisV12UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};

export type LcVectorStoreRedisV12Params =
	| LcVectorStoreRedisV12LoadConfig
	| LcVectorStoreRedisV12InsertConfig
	| LcVectorStoreRedisV12RetrieveConfig
	| LcVectorStoreRedisV12RetrieveAsToolConfig
	| LcVectorStoreRedisV12UpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreRedisV12Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcVectorStoreRedisV12Node = {
	type: '@n8n/n8n-nodes-langchain.vectorStoreRedis';
	version: 1.2;
	config: NodeConfig<LcVectorStoreRedisV12Params>;
	credentials?: LcVectorStoreRedisV12Credentials;
};