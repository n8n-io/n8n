/**
 * Execute Sub-workflow Node - Version 1
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

export interface ExecuteWorkflowV1Params {
	operation?: unknown;
/**
 * Note on using an expression here: if this node is set to run once with all items, they will all be sent to the &lt;em&gt;same&lt;/em&gt; workflow. That workflow's ID will be calculated by evaluating the expression for the &lt;strong&gt;first input item&lt;/strong&gt;.
 * @hint Can be found in the URL of the workflow
 * @displayOptions.show { source: ["database"] }
 */
		workflowId: string | Expression<string>;
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

export type ExecuteWorkflowV1Node = {
	type: 'n8n-nodes-base.executeWorkflow';
	version: 1;
	config: NodeConfig<ExecuteWorkflowV1Params>;
	credentials?: Record<string, never>;
};