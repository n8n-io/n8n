/**
 * Vector Store Question Answer Tool Node - Version 1
 * Answer questions with a vector store
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolVectorStoreV1Config {
/**
 * Name of the data in vector store. This will be used to fill this tool description: Useful for when you need to answer questions about [name]. Whenever you need information about [data description], you should ALWAYS use this. Input should be a fully formed question.
 */
		name?: string | Expression<string>;
/**
 * Describe the data in vector store. This will be used to fill this tool description: Useful for when you need to answer questions about [name]. Whenever you need information about [data description], you should ALWAYS use this. Input should be a fully formed question.
 */
		description?: string | Expression<string>;
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

interface LcToolVectorStoreV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolVectorStore';
	version: 1;
	isTrigger: true;
}

export type LcToolVectorStoreV1Node = LcToolVectorStoreV1NodeBase & {
	config: NodeConfig<LcToolVectorStoreV1Config>;
};

export type LcToolVectorStoreV1Node = LcToolVectorStoreV1Node;