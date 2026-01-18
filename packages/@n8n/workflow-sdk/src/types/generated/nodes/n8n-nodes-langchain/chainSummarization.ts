/**
 * Summarization Chain Node Types
 *
 * Transforms text into a concise summary
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/chainsummarization/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcChainSummarizationV21Params {
	/**
	 * How to pass data into the summarization chain
	 * @default nodeInputJson
	 */
	operationMode?: 'nodeInputJson' | 'nodeInputBinary' | 'documentLoader' | Expression<string>;
	/**
	 * Chunk splitting strategy
	 * @default simple
	 */
	chunkingMode?: 'simple' | 'advanced' | Expression<string>;
	/**
	 * Controls the max size (in terms of number of characters) of the final document chunk
	 * @default 1000
	 */
	chunkSize?: number | Expression<number>;
	/**
	 * Specifies how much characters overlap there should be between chunks
	 * @default 200
	 */
	chunkOverlap?: number | Expression<number>;
	options?: Record<string, unknown>;
}

export interface LcChainSummarizationV1Params {
	/**
	 * The type of summarization to run
	 * @default map_reduce
	 */
	type?: 'map_reduce' | 'refine' | 'stuff' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcChainSummarizationNode = {
	type: '@n8n/n8n-nodes-langchain.chainSummarization';
	version: 1 | 2 | 2.1;
	config: NodeConfig<LcChainSummarizationV21Params>;
	credentials?: Record<string, never>;
};
