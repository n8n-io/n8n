/**
 * Loop Over Items (Split in Batches) Node - Version 3
 * Split data into batches and iterate over each batch
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
// Node Types
// ===========================================================================

interface SplitInBatchesV3NodeBase {
	type: 'n8n-nodes-base.splitInBatches';
	version: 3;
}

export type SplitInBatchesV3ParamsNode = SplitInBatchesV3NodeBase & {
	config: NodeConfig<SplitInBatchesV3Params>;
};

export type SplitInBatchesV3Node = SplitInBatchesV3ParamsNode;