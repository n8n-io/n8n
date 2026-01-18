/**
 * If Node - Version 2.1
 * Route items to different branches (true/false)
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

export interface IfV21Params {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type IfV21Node = {
	type: 'n8n-nodes-base.if';
	version: 2.1;
	config: NodeConfig<IfV21Params>;
	credentials?: Record<string, never>;
};