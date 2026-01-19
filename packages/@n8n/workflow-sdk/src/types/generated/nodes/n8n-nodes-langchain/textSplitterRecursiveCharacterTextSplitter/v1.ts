/**
 * Recursive Character Text Splitter Node - Version 1
 * Split text into chunks by characters recursively, recommended for most use cases
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextSplitterRecursiveCharacterTextSplitterV1Config {
	chunkSize?: number | Expression<number>;
	chunkOverlap?: number | Expression<number>;
/**
 * Additional options to add
 * @default {}
 */
		options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcTextSplitterRecursiveCharacterTextSplitterV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter';
	version: 1;
	isTrigger: true;
}

export type LcTextSplitterRecursiveCharacterTextSplitterV1Node = LcTextSplitterRecursiveCharacterTextSplitterV1NodeBase & {
	config: NodeConfig<LcTextSplitterRecursiveCharacterTextSplitterV1Config>;
};

export type LcTextSplitterRecursiveCharacterTextSplitterV1Node = LcTextSplitterRecursiveCharacterTextSplitterV1Node;