/**
 * Filter Node - Version 2.2
 * Remove items matching a condition
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV22Params {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface FilterV22NodeBase {
	type: 'n8n-nodes-base.filter';
	version: 2.2;
}

export type FilterV22ParamsNode = FilterV22NodeBase & {
	config: NodeConfig<FilterV22Params>;
};

export type FilterV22Node = FilterV22ParamsNode;