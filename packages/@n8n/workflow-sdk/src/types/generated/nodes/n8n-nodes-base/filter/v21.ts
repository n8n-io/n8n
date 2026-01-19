/**
 * Filter Node - Version 2.1
 * Remove items matching a condition
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV21Config {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface FilterV21NodeBase {
	type: 'n8n-nodes-base.filter';
	version: 2.1;
}

export type FilterV21Node = FilterV21NodeBase & {
	config: NodeConfig<FilterV21Config>;
};

export type FilterV21Node = FilterV21Node;