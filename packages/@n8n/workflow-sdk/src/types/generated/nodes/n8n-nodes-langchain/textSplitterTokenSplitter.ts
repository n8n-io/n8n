/**
 * Token Splitter Node Types
 *
 * Split text into chunks by tokens
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/textsplittertokensplitter/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

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
// Node Type
// ===========================================================================

export type LcTextSplitterTokenSplitterNode = {
	type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter';
	version: 1;
	config: NodeConfig<LcTextSplitterTokenSplitterV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
