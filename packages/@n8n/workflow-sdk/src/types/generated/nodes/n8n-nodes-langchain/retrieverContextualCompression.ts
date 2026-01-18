/**
 * Contextual Compression Retriever Node Types
 *
 * Enhances document similarity search by contextual compression.
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/retrievercontextualcompression/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverContextualCompressionV1Params {}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcRetrieverContextualCompressionV1Node = {
	type: '@n8n/n8n-nodes-langchain.retrieverContextualCompression';
	version: 1;
	config: NodeConfig<LcRetrieverContextualCompressionV1Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcRetrieverContextualCompressionNode = LcRetrieverContextualCompressionV1Node;
