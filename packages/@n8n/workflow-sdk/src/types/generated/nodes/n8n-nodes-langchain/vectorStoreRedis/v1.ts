/**
 * Redis Vector Store Node - Version 1
 * Work with your data in a Redis vector index
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many ranked documents from vector store for query */
export type LcVectorStoreRedisV1LoadConfig = {
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
export type LcVectorStoreRedisV1InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreRedisV1RetrieveConfig = {
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
export type LcVectorStoreRedisV1RetrieveAsToolConfig = {
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
export type LcVectorStoreRedisV1UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};

export type LcVectorStoreRedisV1Params =
	| LcVectorStoreRedisV1LoadConfig
	| LcVectorStoreRedisV1InsertConfig
	| LcVectorStoreRedisV1RetrieveConfig
	| LcVectorStoreRedisV1RetrieveAsToolConfig
	| LcVectorStoreRedisV1UpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreRedisV1Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreRedisV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreRedis';
	version: 1;
	credentials?: LcVectorStoreRedisV1Credentials;
}

export type LcVectorStoreRedisV1LoadNode = LcVectorStoreRedisV1NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV1LoadConfig>;
};

export type LcVectorStoreRedisV1InsertNode = LcVectorStoreRedisV1NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV1InsertConfig>;
};

export type LcVectorStoreRedisV1RetrieveNode = LcVectorStoreRedisV1NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV1RetrieveConfig>;
};

export type LcVectorStoreRedisV1RetrieveAsToolNode = LcVectorStoreRedisV1NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV1RetrieveAsToolConfig>;
};

export type LcVectorStoreRedisV1UpdateNode = LcVectorStoreRedisV1NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV1UpdateConfig>;
};

export type LcVectorStoreRedisV1Node =
	| LcVectorStoreRedisV1LoadNode
	| LcVectorStoreRedisV1InsertNode
	| LcVectorStoreRedisV1RetrieveNode
	| LcVectorStoreRedisV1RetrieveAsToolNode
	| LcVectorStoreRedisV1UpdateNode
	;