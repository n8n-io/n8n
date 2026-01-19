/**
 * Execute Sub-workflow Node - Version 1.3
 * Execute another workflow
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowV13Params {
	operation?: unknown;
/**
 * The path to local JSON workflow file to execute
 * @displayOptions.show { source: ["localFile"] }
 */
		workflowPath: string | Expression<string>;
/**
 * The workflow JSON code to execute
 * @displayOptions.show { source: ["parameter"] }
 * @default 



 */
		workflowJson: IDataObject | string | Expression<string>;
/**
 * The URL from which to load the workflow from
 * @displayOptions.show { source: ["url"] }
 */
		workflowUrl: string | Expression<string>;
	mode?: 'once' | 'each' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface ExecuteWorkflowV13NodeBase {
	type: 'n8n-nodes-base.executeWorkflow';
	version: 1.3;
}

export type ExecuteWorkflowV13ParamsNode = ExecuteWorkflowV13NodeBase & {
	config: NodeConfig<ExecuteWorkflowV13Params>;
};

export type ExecuteWorkflowV13Node = ExecuteWorkflowV13ParamsNode;