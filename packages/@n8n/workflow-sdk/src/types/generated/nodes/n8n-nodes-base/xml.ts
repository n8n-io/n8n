/**
 * XML Node Types
 *
 * Convert data from and to XML
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/xml/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Converts data from JSON to XML */
export type XmlV1JsonToxmlConfig = {
	mode: 'jsonToxml';
	/**
	 * Name of the property to which to contains the converted XML data
	 * @displayOptions.show { mode: ["jsonToxml"] }
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Converts data from XML to JSON */
export type XmlV1XmlToJsonConfig = {
	mode: 'xmlToJson';
	/**
	 * Name of the property which contains the XML data to convert
	 * @displayOptions.show { mode: ["xmlToJson"] }
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type XmlV1Params = XmlV1JsonToxmlConfig | XmlV1XmlToJsonConfig;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type XmlV1Node = {
	type: 'n8n-nodes-base.xml';
	version: 1;
	config: NodeConfig<XmlV1Params>;
	credentials?: Record<string, never>;
};

export type XmlNode = XmlV1Node;
