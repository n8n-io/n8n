/**
 * Limit Node Types
 *
 * Restrict the number of items
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/limit/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LimitV1Params {
	/**
	 * If there are more items than this number, some are removed
	 * @default 1
	 */
	maxItems?: number | Expression<number>;
	/**
	 * When removing items, whether to keep the ones at the start or the ending
	 * @default firstItems
	 */
	keep?: 'firstItems' | 'lastItems' | Expression<string>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LimitNode = {
	type: 'n8n-nodes-base.limit';
	version: 1;
	config: NodeConfig<LimitV1Params>;
	credentials?: Record<string, never>;
};
