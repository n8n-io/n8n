/**
 * Execution Data Node Types
 *
 * Add execution data for search
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/executiondata/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecutionDataV11Params {
	operation?: 'save' | Expression<string>;
	dataToSave?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ExecutionDataNode = {
	type: 'n8n-nodes-base.executionData';
	version: 1 | 1.1;
	config: NodeConfig<ExecutionDataV11Params>;
	credentials?: Record<string, never>;
};
