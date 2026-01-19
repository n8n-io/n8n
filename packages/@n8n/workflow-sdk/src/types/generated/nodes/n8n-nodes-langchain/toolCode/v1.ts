/**
 * Code Tool Node - Version 1
 * Write a tool in JS or Python
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolCodeV1Params {
	name?: string | Expression<string>;
	description?: string | Expression<string>;
	language?: 'javaScript' | 'python' | Expression<string>;
/**
 * E.g. Converts any text to uppercase
 * @hint You can access the input the tool receives via the input property "query". The returned value should be a single string.
 * @displayOptions.show { language: ["javaScript"] }
 * @default // Example: convert the incoming query to uppercase and return it
return query.toUpperCase()
 */
		jsCode?: string | Expression<string>;
/**
 * E.g. Converts any text to uppercase
 * @hint You can access the input the tool receives via the input property "_query". The returned value should be a single string.
 * @displayOptions.show { language: ["python"] }
 * @default # Example: convert the incoming query to uppercase and return it
return _query.upper()
 */
		pythonCode?: string | Expression<string>;
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
 * @displayOptions.show { specifyInputSchema: [true], schemaType: ["fromJson"] }
 * @default {
	"some_input": "some_value"
}
 */
		jsonSchemaExample?: IDataObject | string | Expression<string>;
/**
 * Schema to use for the function
 * @hint Use &lt;a target="_blank" href="https://json-schema.org/"&gt;JSON Schema&lt;/a&gt; format (&lt;a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html"&gt;examples&lt;/a&gt;). $refs syntax is currently not supported.
 * @displayOptions.show { specifyInputSchema: [true], schemaType: ["manual"] }
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

interface LcToolCodeV1NodeBase {
	type: '@n8n/n8n-nodes-langchain.toolCode';
	version: 1;
	isTrigger: true;
}

export type LcToolCodeV1ParamsNode = LcToolCodeV1NodeBase & {
	config: NodeConfig<LcToolCodeV1Params>;
};

export type LcToolCodeV1Node = LcToolCodeV1ParamsNode;