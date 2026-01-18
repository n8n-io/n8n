/**
 * Filter Node - Version 2.3
 * Remove items matching a condition
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface FilterV23Params {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type FilterV23Node = {
	type: 'n8n-nodes-base.filter';
	version: 2.3;
	config: NodeConfig<FilterV23Params>;
	credentials?: Record<string, never>;
};