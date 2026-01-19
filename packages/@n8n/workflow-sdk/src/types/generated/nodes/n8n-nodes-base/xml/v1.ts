/**
 * XML Node - Version 1
 * Convert data from and to XML
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

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

export type XmlV1Params =
	| XmlV1JsonToxmlConfig
	| XmlV1XmlToJsonConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface XmlV1NodeBase {
	type: 'n8n-nodes-base.xml';
	version: 1;
}

export type XmlV1JsonToxmlNode = XmlV1NodeBase & {
	config: NodeConfig<XmlV1JsonToxmlConfig>;
};

export type XmlV1XmlToJsonNode = XmlV1NodeBase & {
	config: NodeConfig<XmlV1XmlToJsonConfig>;
};

export type XmlV1Node =
	| XmlV1JsonToxmlNode
	| XmlV1XmlToJsonNode
	;