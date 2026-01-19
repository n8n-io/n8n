/**
 * Redis Vector Store Node - Version 1.1
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
export type LcVectorStoreRedisV11LoadConfig = {
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
export type LcVectorStoreRedisV11InsertConfig = {
	mode: 'insert';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Retrieve documents from vector store to be used as vector store with AI nodes */
export type LcVectorStoreRedisV11RetrieveConfig = {
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
export type LcVectorStoreRedisV11RetrieveAsToolConfig = {
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
export type LcVectorStoreRedisV11UpdateConfig = {
	mode: 'update';
	ragStarterCallout?: unknown;
	redisIndex: ResourceLocatorValue;
/**
 * ID of an embedding entry
 * @displayOptions.show { mode: ["update"] }
 */
		id: string | Expression<string>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface LcVectorStoreRedisV11Credentials {
	redis: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface LcVectorStoreRedisV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.vectorStoreRedis';
	version: 1.1;
	credentials?: LcVectorStoreRedisV11Credentials;
}

export type LcVectorStoreRedisV11LoadNode = LcVectorStoreRedisV11NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV11LoadConfig>;
};

export type LcVectorStoreRedisV11InsertNode = LcVectorStoreRedisV11NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV11InsertConfig>;
};

export type LcVectorStoreRedisV11RetrieveNode = LcVectorStoreRedisV11NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV11RetrieveConfig>;
};

export type LcVectorStoreRedisV11RetrieveAsToolNode = LcVectorStoreRedisV11NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV11RetrieveAsToolConfig>;
};

export type LcVectorStoreRedisV11UpdateNode = LcVectorStoreRedisV11NodeBase & {
	config: NodeConfig<LcVectorStoreRedisV11UpdateConfig>;
};

export type LcVectorStoreRedisV11Node =
	| LcVectorStoreRedisV11LoadNode
	| LcVectorStoreRedisV11InsertNode
	| LcVectorStoreRedisV11RetrieveNode
	| LcVectorStoreRedisV11RetrieveAsToolNode
	| LcVectorStoreRedisV11UpdateNode
	;