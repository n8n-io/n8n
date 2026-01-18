/**
 * Extract from File Node Types
 *
 * Convert binary data to JSON
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/extractfromfile/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ExtractFromFileV11Params {
	operation?:
		| 'csv'
		| 'html'
		| 'fromIcs'
		| 'fromJson'
		| 'ods'
		| 'pdf'
		| 'rtf'
		| 'text'
		| 'xml'
		| 'xls'
		| 'xlsx'
		| 'binaryToPropery'
		| Expression<string>;
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
// Node Types
// ===========================================================================

export type ExtractFromFileV11Node = {
	type: 'n8n-nodes-base.extractFromFile';
	version: 1 | 1.1;
	config: NodeConfig<ExtractFromFileV11Params>;
	credentials?: Record<string, never>;
};

export type ExtractFromFileNode = ExtractFromFileV11Node;
