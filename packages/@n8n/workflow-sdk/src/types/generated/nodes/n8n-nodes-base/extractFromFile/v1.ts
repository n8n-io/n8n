/**
 * Extract from File Node - Version 1
 * Convert binary data to JSON
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExtractFromFileV1Params {
	operation?: 'csv' | 'html' | 'fromIcs' | 'fromJson' | 'ods' | 'pdf' | 'rtf' | 'text' | 'xml' | 'xls' | 'xlsx' | 'binaryToPropery' | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * The name of the output field that will contain the extracted data
 * @displayOptions.show { operation: ["binaryToPropery", "fromJson", "text", "fromIcs", "xml"] }
 * @default data
 */
		destinationKey: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ExtractFromFileV1Node = {
	type: 'n8n-nodes-base.extractFromFile';
	version: 1;
	config: NodeConfig<ExtractFromFileV1Params>;
	credentials?: Record<string, never>;
};