/**
 * If Node - Version 2.3
 * Route items to different branches (true/false)
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface IfV23Params {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface IfV23NodeBase {
	type: 'n8n-nodes-base.if';
	version: 2.3;
}

export type IfV23ParamsNode = IfV23NodeBase & {
	config: NodeConfig<IfV23Params>;
};

export type IfV23Node = IfV23ParamsNode;