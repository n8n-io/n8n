/**
 * Loop Over Items (Split in Batches) Node Types
 *
 * Split data into batches and iterate over each batch
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/splitinbatches/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

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

export interface SplitInBatchesV2Params {
	/**
	 * The number of items to return with each call
	 * @default 10
	 */
	batchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
}

export interface SplitInBatchesV1Params {
	/**
	 * The number of items to return with each call
	 * @default 10
	 */
	batchSize?: number | Expression<number>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SplitInBatchesNode = {
	type: 'n8n-nodes-base.splitInBatches';
	version: 1 | 2 | 3;
	config: NodeConfig<SplitInBatchesV3Params>;
	credentials?: Record<string, never>;
};
