/**
 * Character Text Splitter Node - Version 1
 * Split text into chunks by characters
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextSplitterCharacterTextSplitterV1Params {
	separator?: string | Expression<string>;
/**
 * Maximum number of characters per chunk
 * @default 1000
 */
		chunkSize?: number | Expression<number>;
/**
 * Number of characters shared between consecutive chunks to preserve context
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

export type LcTextSplitterCharacterTextSplitterV1Node = {
	type: '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter';
	version: 1;
	config: NodeConfig<LcTextSplitterCharacterTextSplitterV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};