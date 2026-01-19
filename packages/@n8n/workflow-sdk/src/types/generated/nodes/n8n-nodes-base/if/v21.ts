/**
 * If Node - Version 2.1
 * Route items to different branches (true/false)
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type FilterValue = { conditions: Array<{ leftValue: unknown; operator: { type: string; operation: string }; rightValue: unknown }> };

// ===========================================================================
// Parameters
// ===========================================================================

export interface IfV21Config {
	conditions?: FilterValue;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface IfV21NodeBase {
	type: 'n8n-nodes-base.if';
	version: 2.1;
}

export type IfV21Node = IfV21NodeBase & {
	config: NodeConfig<IfV21Config>;
};

export type IfV21Node = IfV21Node;