/**
 * Execution Data Node - Version 1
 * Add execution data for search
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecutionDataV1Params {
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
// Node Types
// ===========================================================================

interface ExecutionDataV1NodeBase {
	type: 'n8n-nodes-base.executionData';
	version: 1;
}

export type ExecutionDataV1ParamsNode = ExecutionDataV1NodeBase & {
	config: NodeConfig<ExecutionDataV1Params>;
};

export type ExecutionDataV1Node = ExecutionDataV1ParamsNode;