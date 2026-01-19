/**
 * Vector Store Retriever Node - Version 1
 * Use a Vector Store as Retriever
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverVectorStoreV1Config {
/**
 * The maximum number of results to return
 * @default 4
 */
		topK?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcRetrieverVectorStoreV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.retrieverVectorStore';
	version: 1;
	isTrigger: true;
}

export type LcRetrieverVectorStoreV1Node = LcRetrieverVectorStoreV1NodeBase & {
	config: NodeConfig<LcRetrieverVectorStoreV1Config>;
};

export type LcRetrieverVectorStoreV1Node = LcRetrieverVectorStoreV1Node;