/**
 * Character Text Splitter Node - Version 1
 * Split text into chunks by characters
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
// Node Types
// ===========================================================================

interface LcTextSplitterCharacterTextSplitterV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter';
	version: 1;
	isTrigger: true;
}

export type LcTextSplitterCharacterTextSplitterV1ParamsNode = LcTextSplitterCharacterTextSplitterV1NodeBase & {
	config: NodeConfig<LcTextSplitterCharacterTextSplitterV1Params>;
};

export type LcTextSplitterCharacterTextSplitterV1Node = LcTextSplitterCharacterTextSplitterV1ParamsNode;