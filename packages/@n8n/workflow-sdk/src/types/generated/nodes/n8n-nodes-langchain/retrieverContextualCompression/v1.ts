/**
 * Contextual Compression Retriever Node - Version 1
 * Enhances document similarity search by contextual compression.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverContextualCompressionV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcRetrieverContextualCompressionV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.retrieverContextualCompression';
	version: 1;
	isTrigger: true;
}

export type LcRetrieverContextualCompressionV1ParamsNode = LcRetrieverContextualCompressionV1NodeBase & {
	config: NodeConfig<LcRetrieverContextualCompressionV1Params>;
};

export type LcRetrieverContextualCompressionV1Node = LcRetrieverContextualCompressionV1ParamsNode;