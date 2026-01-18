/**
 * Contextual Compression Retriever Node - Version 1
 * Enhances document similarity search by contextual compression.
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverContextualCompressionV1Params {
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type LcRetrieverContextualCompressionV1Node = {
	type: '@n8n/n8n-nodes-langchain.retrieverContextualCompression';
	version: 1;
	config: NodeConfig<LcRetrieverContextualCompressionV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};