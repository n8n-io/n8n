/**
 * Split In Batches Node - Version 1
 * Split data into batches and iterate over each batch
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SplitInBatchesV1Params {
/**
 * The number of items to return with each call
 * @default 10
 */
		batchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type SplitInBatchesV1Node = {
	type: 'n8n-nodes-base.splitInBatches';
	version: 1;
	config: NodeConfig<SplitInBatchesV1Params>;
	credentials?: Record<string, never>;
};