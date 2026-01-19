/**
 * Structured Output Parser Node - Version 1.1
 * Return data in a defined JSON format
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserStructuredV11Config {
/**
 * Example JSON object to use to generate the schema
 * @displayOptions.show { schemaType: ["fromJson"] }
 * @default {
	"state": "California",
	"cities": ["Los Angeles", "San Francisco", "San Diego"]
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
		"state": {
			"type": "string"
		},
		"cities": {
			"type": "array",
			"items": {
				"type": "string"
			}
		}
	}
}
 */
		inputSchema?: IDataObject | string | Expression<string>;
/**
 * Whether to automatically fix the output when it is not in the correct format. Will cause another LLM call.
 * @default false
 */
		autoFix?: boolean | Expression<boolean>;
/**
 * Whether to customize the prompt used for retrying the output parsing. If disabled, a default prompt will be used.
 * @displayOptions.show { autoFix: [true] }
 * @default false
 */
		customizeRetryPrompt?: boolean | Expression<boolean>;
/**
 * Prompt template used for fixing the output. Uses placeholders: "{instructions}" for parsing rules, "{completion}" for the failed attempt, and "{error}" for the validation error message.
 * @hint Should include "{error}", "{instructions}", and "{completion}" placeholders
 * @displayOptions.show { autoFix: [true], customizeRetryPrompt: [true] }
 * @default Instructions:
--------------
{instructions}
--------------
Completion:
--------------
{completion}
--------------

Above, the Completion did not satisfy the constraints given in the Instructions.
Error:
--------------
{error}
--------------

Please try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:
 */
		prompt?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcOutputParserStructuredV11NodeBase {
	type: '@n8n/n8n-nodes-langchain.outputParserStructured';
	version: 1.1;
}

export type LcOutputParserStructuredV11Node = LcOutputParserStructuredV11NodeBase & {
	config: NodeConfig<LcOutputParserStructuredV11Config>;
};

export type LcOutputParserStructuredV11Node = LcOutputParserStructuredV11Node;