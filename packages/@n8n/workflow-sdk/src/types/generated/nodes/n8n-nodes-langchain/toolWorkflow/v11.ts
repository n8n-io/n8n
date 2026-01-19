/**
 * Call n8n Workflow Tool Node - Version 1.1
 * Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolWorkflowV11Params {
	description?: string | Expression<string>;
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
 * These will be output by the 'execute workflow' trigger of the workflow being called
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
/**
 * Whether to specify the schema for the function. This would require the LLM to provide the input in the correct format and would validate it against the schema.
 * @default false
 */
		specifyInputSchema?: boolean | Expression<boolean>;
/**
 * How to specify the schema for the function
 * @displayOptions.show { specifyInputSchema: [true] }
 * @default fromJson
 */
		schemaType?: 'fromJson' | 'manual' | Expression<string>;
/**
 * Example JSON object to use to generate the schema
 * @displayOptions.show { schemaType: ["fromJson"] }
 * @default {
	"some_input": "some_value"
}
 */
		jsonSchemaExample?: IDataObject | string | Expression<string>;
/**
 * Schema to use for the function
 * @hint Use &lt;a target="_blank" href="https://json-schema.org/"&gt;JSON Schema&lt;/a&gt; format (&lt;a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html"&gt;examples&lt;/a&gt;). $refs syntax is currently not supported.
 * @displayOptions.show { schemaType: ["manual"] }
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

interface LcToolWorkflowV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolWorkflow';
	version: 1.1;
	isTrigger: true;
}

export type LcToolWorkflowV11ParamsNode = LcToolWorkflowV11NodeBase & {
	config: NodeConfig<LcToolWorkflowV11Params>;
};

export type LcToolWorkflowV11Node = LcToolWorkflowV11ParamsNode;