/**
 * Execution Data Node - Version 1.1
 * Add execution data for search
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecutionDataV11Config {
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

interface ExecutionDataV11NodeBase {
	type: 'n8n-nodes-base.executionData';
	version: 1.1;
}

export type ExecutionDataV11Node = ExecutionDataV11NodeBase & {
	config: NodeConfig<ExecutionDataV11Config>;
};

export type ExecutionDataV11Node = ExecutionDataV11Node;