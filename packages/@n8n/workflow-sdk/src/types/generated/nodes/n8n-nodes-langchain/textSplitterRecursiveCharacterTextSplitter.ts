/**
 * Recursive Character Text Splitter Node Types
 *
 * Split text into chunks by characters recursively, recommended for most use cases
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/textsplitterrecursivecharactertextsplitter/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcTextSplitterRecursiveCharacterTextSplitterV1Params {
	chunkSize?: number | Expression<number>;
	chunkOverlap?: number | Expression<number>;
	/**
	 * Additional options to add
	 * @default {}
	 */
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcTextSplitterRecursiveCharacterTextSplitterNode = {
	type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter';
	version: 1;
	config: NodeConfig<LcTextSplitterRecursiveCharacterTextSplitterV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
