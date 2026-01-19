/**
 * Split In Batches Node - Version 1
 * Split data into batches and iterate over each batch
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface SplitInBatchesV1Config {
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

interface SplitInBatchesV1NodeBase {
	type: 'n8n-nodes-base.splitInBatches';
	version: 1;
}

export type SplitInBatchesV1Node = SplitInBatchesV1NodeBase & {
	config: NodeConfig<SplitInBatchesV1Config>;
};

export type SplitInBatchesV1Node = SplitInBatchesV1Node;