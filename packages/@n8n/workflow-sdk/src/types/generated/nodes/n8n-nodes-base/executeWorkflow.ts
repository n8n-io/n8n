/**
 * Execute Sub-workflow Node Types
 *
 * Execute another workflow
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/executeworkflow/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExecuteWorkflowV13Params {
	operation?: unknown;
	/**
	 * Where to get the workflow to execute from
	 * @default database
	 */
	source?: 'database' | 'localFile' | 'parameter' | 'url' | Expression<string>;
	/**
	 * Note on using an expression here: if this node is set to run once with all items, they will all be sent to the &lt;em&gt;same&lt;/em&gt; workflow. That workflow's ID will be calculated by evaluating the expression for the &lt;strong&gt;first input item&lt;/strong&gt;.
	 * @hint Can be found in the URL of the workflow
	 */
	workflowId: string | Expression<string>;
	/**
	 * The path to local JSON workflow file to execute
	 */
	workflowPath: string | Expression<string>;
	/**
 * The workflow JSON code to execute
 * @default 



 */
	workflowJson: IDataObject | string | Expression<string>;
	/**
	 * The URL from which to load the workflow from
	 */
	workflowUrl: string | Expression<string>;
	workflowInputs: string | Expression<string>;
	mode?: 'once' | 'each' | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ExecuteWorkflowV13Node = {
	type: 'n8n-nodes-base.executeWorkflow';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<ExecuteWorkflowV13Params>;
	credentials?: Record<string, never>;
};

export type ExecuteWorkflowNode = ExecuteWorkflowV13Node;
