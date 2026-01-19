/**
 * Filter Node - Version 2
 * Remove items matching a condition
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV2Config {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface FilterV2NodeBase {
	type: 'n8n-nodes-base.filter';
	version: 2;
}

export type FilterV2Node = FilterV2NodeBase & {
	config: NodeConfig<FilterV2Config>;
};

export type FilterV2Node = FilterV2Node;