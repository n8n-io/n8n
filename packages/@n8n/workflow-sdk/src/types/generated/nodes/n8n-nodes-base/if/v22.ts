/**
 * If Node - Version 2.2
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

export interface IfV22Params {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type IfV22Node = {
	type: 'n8n-nodes-base.if';
	version: 2.2;
	config: NodeConfig<IfV22Params>;
	credentials?: Record<string, never>;
};