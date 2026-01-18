/**
 * Information Extractor Node Types
 *
 * Extract information from text in a structured format
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/informationextractor/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
	attributes?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type LcInformationExtractorV12Node = {
	type: '@n8n/n8n-nodes-langchain.informationExtractor';
	version: 1 | 1.1 | 1.2;
	config: NodeConfig<LcInformationExtractorV12Params>;
	credentials?: Record<string, never>;
};

export type LcInformationExtractorNode = LcInformationExtractorV12Node;
