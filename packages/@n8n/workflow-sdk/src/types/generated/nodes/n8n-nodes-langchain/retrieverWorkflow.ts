/**
 * Workflow Retriever Node Types
 *
 * Use an n8n Workflow as Retriever
 * @subnodeType ai_retriever
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
	fields?: {
		values?: Array<{
			name?: string | Expression<string>;
			type?:
				| 'stringValue'
				| 'numberValue'
				| 'booleanValue'
				| 'arrayValue'
				| 'objectValue'
				| Expression<string>;
			stringValue?: string | Expression<string>;
			numberValue?: string | Expression<string>;
			booleanValue?: 'true' | 'false' | Expression<string>;
			arrayValue?: string | Expression<string>;
			objectValue?: IDataObject | string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcRetrieverWorkflowV11Node = {
	type: '@n8n/n8n-nodes-langchain.retrieverWorkflow';
	version: 1 | 1.1;
	config: NodeConfig<LcRetrieverWorkflowV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcRetrieverWorkflowNode = LcRetrieverWorkflowV11Node;
