/**
 * Loop Over Items (Split in Batches) Node - Version 3
 * Split data into batches and iterate over each batch
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SplitInBatchesV3Params {
/**
 * The number of items to return with each call
 * @default 1
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

export type SplitInBatchesV3Node = {
	type: 'n8n-nodes-base.splitInBatches';
	version: 3;
	config: NodeConfig<SplitInBatchesV3Params>;
	credentials?: Record<string, never>;
};