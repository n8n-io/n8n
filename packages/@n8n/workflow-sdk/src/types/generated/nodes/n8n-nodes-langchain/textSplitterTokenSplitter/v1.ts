/**
 * Token Splitter Node - Version 1
 * Split text into chunks by tokens
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextSplitterTokenSplitterV1Config {
/**
 * Maximum number of tokens per chunk
 * @default 1000
 */
		chunkSize?: number | Expression<number>;
/**
 * Number of tokens shared between consecutive chunks to preserve context
 * @default 0
 */
		chunkOverlap?: number | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcTextSplitterTokenSplitterV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter';
	version: 1;
	isTrigger: true;
}

export type LcTextSplitterTokenSplitterV1Node = LcTextSplitterTokenSplitterV1NodeBase & {
	config: NodeConfig<LcTextSplitterTokenSplitterV1Config>;
};

export type LcTextSplitterTokenSplitterV1Node = LcTextSplitterTokenSplitterV1Node;