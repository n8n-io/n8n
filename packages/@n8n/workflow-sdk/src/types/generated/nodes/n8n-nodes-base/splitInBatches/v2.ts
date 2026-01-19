/**
 * Split In Batches Node - Version 2
 * Split data into batches and iterate over each batch
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SplitInBatchesV2Params {
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
// Node Types
// ===========================================================================

interface SplitInBatchesV2NodeBase {
	type: 'n8n-nodes-base.splitInBatches';
	version: 2;
}

export type SplitInBatchesV2ParamsNode = SplitInBatchesV2NodeBase & {
	config: NodeConfig<SplitInBatchesV2Params>;
};

export type SplitInBatchesV2Node = SplitInBatchesV2ParamsNode;