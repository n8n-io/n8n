/**
 * Execute Sub-workflow Node - Version 1.2
 * Execute another workflow
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowV12Params {
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
// Node Type
// ===========================================================================

export type ExecuteWorkflowV12Node = {
	type: 'n8n-nodes-base.executeWorkflow';
	version: 1.2;
	config: NodeConfig<ExecuteWorkflowV12Params>;
	credentials?: Record<string, never>;
};