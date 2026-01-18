/**
 * Summarization Chain Node - Version 1
 * Transforms text into a concise summary
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type LcChainSummarizationV1Node = {
	type: '@n8n/n8n-nodes-langchain.chainSummarization';
	version: 1;
	config: NodeConfig<LcChainSummarizationV1Params>;
	credentials?: Record<string, never>;
};