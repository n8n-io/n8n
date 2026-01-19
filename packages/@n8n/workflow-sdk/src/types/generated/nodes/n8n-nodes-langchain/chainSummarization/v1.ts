/**
 * Summarization Chain Node - Version 1
 * Transforms text into a concise summary
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcChainSummarizationV1Params {
/**
 * The type of summarization to run
 * @default map_reduce
 */
		type?: 'map_reduce' | 'refine' | 'stuff' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcChainSummarizationV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.chainSummarization';
	version: 1;
}

export type LcChainSummarizationV1ParamsNode = LcChainSummarizationV1NodeBase & {
	config: NodeConfig<LcChainSummarizationV1Params>;
};

export type LcChainSummarizationV1Node = LcChainSummarizationV1ParamsNode;