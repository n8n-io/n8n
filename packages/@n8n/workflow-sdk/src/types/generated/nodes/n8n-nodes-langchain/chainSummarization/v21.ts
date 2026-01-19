/**
 * Summarization Chain Node - Version 2.1
 * Transforms text into a concise summary
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcChainSummarizationV21Config {
/**
 * How to pass data into the summarization chain
 * @default nodeInputJson
 */
		operationMode?: 'nodeInputJson' | 'nodeInputBinary' | 'documentLoader' | Expression<string>;
/**
 * Chunk splitting strategy
 * @displayOptions.show { /operationMode: ["nodeInputJson", "nodeInputBinary"] }
 * @default simple
 */
		chunkingMode?: 'simple' | 'advanced' | Expression<string>;
/**
 * Controls the max size (in terms of number of characters) of the final document chunk
 * @displayOptions.show { /chunkingMode: ["simple"] }
 * @default 1000
 */
		chunkSize?: number | Expression<number>;
/**
 * Specifies how much characters overlap there should be between chunks
 * @displayOptions.show { /chunkingMode: ["simple"] }
 * @default 200
 */
		chunkOverlap?: number | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainSummarizationV21NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainSummarization';
	version: 2.1;
}

export type LcChainSummarizationV21Node = LcChainSummarizationV21NodeBase & {
	config: NodeConfig<LcChainSummarizationV21Config>;
};

export type LcChainSummarizationV21Node = LcChainSummarizationV21Node;