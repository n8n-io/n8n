/**
 * Execution Data Node - Version 1.1
 * Add execution data for search
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecutionDataV11Params {
	operation?: 'save' | Expression<string>;
	dataToSave?: {
		values?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ExecutionDataV11Node = {
	type: 'n8n-nodes-base.executionData';
	version: 1.1;
	config: NodeConfig<ExecutionDataV11Params>;
	credentials?: Record<string, never>;
};