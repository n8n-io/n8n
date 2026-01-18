/**
 * Call n8n Workflow Tool Node Types
 *
 * Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.
 * @subnodeType ai_tool
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolworkflow/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWorkflowV22Params {
	/**
	 * The name of the function to be called, could contain letters, numbers, and underscores only
	 */
	name?: string | Expression<string>;
	description?: string | Expression<string>;
	/**
	 * Where to get the workflow to execute from
	 * @default database
	 */
	source?: 'database' | 'parameter' | Expression<string>;
	workflowId: unknown;
	workflowInputs: string | Expression<string>;
	/**
 * The workflow JSON code to execute
 * @default 









 */
	workflowJson: IDataObject | string | Expression<string>;
}

export interface LcToolWorkflowV13Params {
	name?: string | Expression<string>;
	description?: string | Expression<string>;
	/**
	 * Where to get the workflow to execute from
	 * @default database
	 */
	source?: 'database' | 'parameter' | Expression<string>;
	/**
	 * The workflow to execute
	 * @hint Can be found in the URL of the workflow
	 */
	workflowId: string | Expression<string>;
	/**
 * The workflow JSON code to execute
 * @default 









 */
	workflowJson: IDataObject | string | Expression<string>;
	/**
	 * Where to find the data that this tool should return. n8n will look in the output of the last-executed node of the workflow for a field with this name, and return its value.
	 * @hint The field in the last-executed node of the workflow that contains the response
	 * @default response
	 */
	responsePropertyName: string | Expression<string>;
	/**
	 * These will be output by the 'execute workflow' trigger of the workflow being called
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
	/**
	 * Whether to specify the schema for the function. This would require the LLM to provide the input in the correct format and would validate it against the schema.
	 * @default false
	 */
	specifyInputSchema?: boolean | Expression<boolean>;
	/**
	 * How to specify the schema for the function
	 * @default fromJson
	 */
	schemaType?: 'fromJson' | 'manual' | Expression<string>;
	/**
 * Example JSON object to use to generate the schema
 * @default {
	"some_input": "some_value"
}
 */
	jsonSchemaExample?: IDataObject | string | Expression<string>;
	/**
 * Schema to use for the function
 * @hint Use &lt;a target="_blank" href="https://json-schema.org/"&gt;JSON Schema&lt;/a&gt; format (&lt;a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html"&gt;examples&lt;/a&gt;). $refs syntax is currently not supported.
 * @default {
"type": "object",
"properties": {
	"some_input": {
		"type": "string",
		"description": "Some input to the function"
		}
	}
}
 */
	inputSchema?: IDataObject | string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcToolWorkflowV22Node = {
	type: '@n8n/n8n-nodes-langchain.toolWorkflow';
	version: 2 | 2.1 | 2.2;
	config: NodeConfig<LcToolWorkflowV22Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcToolWorkflowV13Node = {
	type: '@n8n/n8n-nodes-langchain.toolWorkflow';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcToolWorkflowV13Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcToolWorkflowNode = LcToolWorkflowV22Node | LcToolWorkflowV13Node;
