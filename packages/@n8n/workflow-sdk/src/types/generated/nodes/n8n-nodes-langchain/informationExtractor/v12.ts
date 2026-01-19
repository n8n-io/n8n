/**
 * Information Extractor Node - Version 1.2
 * Extract information from text in a structured format
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface LcInformationExtractorV12Params {
/**
 * The text to extract information from
 */
		text?: string | Expression<string>;
/**
 * How to specify the schema for the desired output
 * @default fromAttributes
 */
		schemaType?: 'fromAttributes' | 'fromJson' | 'manual' | Expression<string>;
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
	attributes?: {
		attributes?: Array<{
			/** Attribute to extract
			 */
			name?: string | Expression<string>;
			/** Data type of the attribute
			 * @default string
			 */
			type?: 'boolean' | 'date' | 'number' | 'string' | Expression<string>;
			/** Describe your attribute
			 */
			description?: string | Expression<string>;
			/** Whether attribute is required
			 * @default false
			 */
			required?: boolean | Expression<boolean>;
		}>;
	};
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface LcInformationExtractorV12NodeBase {
	type: '@n8n/n8n-nodes-langchain.informationExtractor';
	version: 1.2;
}

export type LcInformationExtractorV12ParamsNode = LcInformationExtractorV12NodeBase & {
	config: NodeConfig<LcInformationExtractorV12Params>;
};

export type LcInformationExtractorV12Node = LcInformationExtractorV12ParamsNode;