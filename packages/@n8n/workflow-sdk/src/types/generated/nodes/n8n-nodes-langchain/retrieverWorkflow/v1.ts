/**
 * Workflow Retriever Node - Version 1
 * Use an n8n Workflow as Retriever
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcRetrieverWorkflowV1Params {
/**
 * Where to get the workflow to execute from
 * @default database
 */
		source?: 'database' | 'parameter' | Expression<string>;
/**
 * The workflow JSON code to execute
 * @displayOptions.show { source: ["parameter"] }
 * @default 



 */
		workflowJson: IDataObject | string | Expression<string>;
/**
 * Set the values which should be made available in the workflow
 * @default {}
 */
		fields?: {
		values?: Array<{
			/** Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.
			 */
			name?: string | Expression<string>;
			/** The field value type
			 * @default stringValue
			 */
			type?: 'stringValue' | 'numberValue' | 'booleanValue' | 'arrayValue' | 'objectValue' | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["stringValue"] }
			 */
			stringValue?: string | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["numberValue"] }
			 */
			numberValue?: string | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["booleanValue"] }
			 * @default true
			 */
			booleanValue?: 'true' | 'false' | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["arrayValue"] }
			 */
			arrayValue?: string | Expression<string>;
			/** Value
			 * @displayOptions.show { type: ["objectValue"] }
			 * @default ={}
			 */
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

interface LcRetrieverWorkflowV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.retrieverWorkflow';
	version: 1;
	isTrigger: true;
}

export type LcRetrieverWorkflowV1ParamsNode = LcRetrieverWorkflowV1NodeBase & {
	config: NodeConfig<LcRetrieverWorkflowV1Params>;
};

export type LcRetrieverWorkflowV1Node = LcRetrieverWorkflowV1ParamsNode;