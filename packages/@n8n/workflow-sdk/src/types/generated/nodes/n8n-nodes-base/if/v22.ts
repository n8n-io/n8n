/**
 * If Node - Version 2.2
 * Route items to different branches (true/false)
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
// Node Types
// ===========================================================================

interface IfV22NodeBase {
	type: 'n8n-nodes-base.if';
	version: 2.2;
}

export type IfV22ParamsNode = IfV22NodeBase & {
	config: NodeConfig<IfV22Params>;
};

export type IfV22Node = IfV22ParamsNode;