/**
 * Token Splitter Node - Version 1
 * Split text into chunks by tokens
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextSplitterTokenSplitterV1Params {
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
// Node Type
// ===========================================================================

export type LcTextSplitterTokenSplitterV1Node = {
	type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter';
	version: 1;
	config: NodeConfig<LcTextSplitterTokenSplitterV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};