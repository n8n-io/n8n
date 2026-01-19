/**
 * Filter Node - Version 2.3
 * Remove items matching a condition
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV23Config {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface FilterV23NodeBase {
	type: 'n8n-nodes-base.filter';
	version: 2.3;
}

export type FilterV23Node = FilterV23NodeBase & {
	config: NodeConfig<FilterV23Config>;
};

export type FilterV23Node = FilterV23Node;