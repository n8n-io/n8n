/**
 * Code Tool Node Types
 *
 * Write a tool in JS or Python
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toolcode/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcToolCodeV13Params {
	name?: string | Expression<string>;
	description?: string | Expression<string>;
	language?: 'javaScript' | 'python' | Expression<string>;
	/**
 * E.g. Converts any text to uppercase
 * @default // Example: convert the incoming query to uppercase and return it
return query.toUpperCase()
 */
	jsCode?: string | Expression<string>;
	/**
 * E.g. Converts any text to uppercase
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

export type LcToolCodeV13Node = {
	type: '@n8n/n8n-nodes-langchain.toolCode';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<LcToolCodeV13Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type LcToolCodeNode = LcToolCodeV13Node;
