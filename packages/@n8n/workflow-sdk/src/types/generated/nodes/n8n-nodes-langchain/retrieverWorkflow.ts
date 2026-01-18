/**
 * Workflow Retriever Node Types
 *
 * Use an n8n Workflow as Retriever
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/retrieverworkflow/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverWorkflowV11Params {
	/**
	 * Where to get the workflow to execute from
	 * @default database
	 */
	source?: 'database' | 'parameter' | Expression<string>;
	/**
	 * The workflow to execute
	 */
	workflowId: string | Expression<string>;
	/**
 * The workflow JSON code to execute
 * @default 



 */
	workflowJson: IDataObject | string | Expression<string>;
	/**
	 * Set the values which should be made available in the workflow
	 * @default {}
	 */
	fields?: Record<string, unknown>;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type LcRetrieverWorkflowNode = {
	type: '@n8n/n8n-nodes-langchain.retrieverWorkflow';
	version: 1 | 1.1;
	config: NodeConfig<LcRetrieverWorkflowV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};
