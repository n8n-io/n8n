/**
 * Limit Node - Version 1
 * Restrict the number of items
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LimitV1Config {
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
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LimitV1NodeBase {
	type: 'n8n-nodes-base.limit';
	version: 1;
}

export type LimitV1Node = LimitV1NodeBase & {
	config: NodeConfig<LimitV1Config>;
};

export type LimitV1Node = LimitV1Node;