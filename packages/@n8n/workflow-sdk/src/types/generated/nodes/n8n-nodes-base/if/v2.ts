/**
 * If Node - Version 2
 * Route items to different branches (true/false)
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface IfV2Params {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface IfV2NodeBase {
	type: 'n8n-nodes-base.if';
	version: 2;
}

export type IfV2ParamsNode = IfV2NodeBase & {
	config: NodeConfig<IfV2Params>;
};

export type IfV2Node = IfV2ParamsNode;