/**
 * Structured Output Parser Node Types
 *
 * Return data in a defined JSON format
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/outputparserstructured/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcOutputParserStructuredV13Params {
	/**
	 * How to specify the schema for the function
	 * @default fromJson
	 */
	schemaType?: 'fromJson' | 'manual' | Expression<string>;
	/**
 * Example JSON object to use to generate the schema
 * @default {
	"state": "California",
	"cities": ["Los Angeles", "San Francisco", "San Diego"]
}
 */
	jsonSchemaExample?: IDataObject | string | Expression<string>;
	/**
 * Schema to use for the function
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
 * JSON Schema to structure and validate the output against
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
	jsonSchema: IDataObject | string | Expression<string>;
	/**
	 * Whether to automatically fix the output when it is not in the correct format. Will cause another LLM call.
	 * @default false
	 */
	autoFix?: boolean | Expression<boolean>;
	/**
	 * Whether to customize the prompt used for retrying the output parsing. If disabled, a default prompt will be used.
	 * @default false
	 */
	customizeRetryPrompt?: boolean | Expression<boolean>;
	/**
 * Prompt template used for fixing the output. Uses placeholders: "{instructions}" for parsing rules, "{completion}" for the failed attempt, and "{error}" for the validation error message.
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

export type LcOutputParserStructuredV13Node = {
	type: '@n8n/n8n-nodes-langchain.outputParserStructured';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcOutputParserStructuredV13Params>;
	credentials?: Record<string, never>;
};

export type LcOutputParserStructuredNode = LcOutputParserStructuredV13Node;
