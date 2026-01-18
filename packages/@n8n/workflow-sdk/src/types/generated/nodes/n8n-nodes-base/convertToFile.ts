/**
 * Convert to File Node Types
 *
 * Convert JSON data to binary data
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/converttofile/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ConvertToFileV11Params {
	operation?:
		| 'csv'
		| 'html'
		| 'iCal'
		| 'toJson'
		| 'ods'
		| 'rtf'
		| 'toText'
		| 'xls'
		| 'xlsx'
		| 'toBinary'
		| Expression<string>;
	binaryPropertyName: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The name of the input field that contains the base64 string to convert to a file. Use dot-notation for deep fields (e.g. 'level1.level2.currentKey').
	 * @displayOptions.show { operation: ["toBinary"] }
	 */
	sourceProperty: string | Expression<string>;
	mode?: 'once' | 'each' | Expression<string>;
	title?: string | Expression<string>;
	/**
	 * Date and time at which the event begins. (For all-day events, the time will be ignored.).
	 * @displayOptions.show { operation: ["iCal"] }
	 */
	start: string | Expression<string>;
	/**
	 * Date and time at which the event ends. (For all-day events, the time will be ignored.).
	 * @hint If not set, will be equal to the start date
	 * @displayOptions.show { operation: ["iCal"] }
	 */
	end: string | Expression<string>;
	/**
	 * Whether the event lasts all day or not
	 * @displayOptions.show { operation: ["iCal"] }
	 * @default false
	 */
	allDay?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ConvertToFileV11Node = {
	type: 'n8n-nodes-base.convertToFile';
	version: 1 | 1.1;
	config: NodeConfig<ConvertToFileV11Params>;
	credentials?: Record<string, never>;
};

export type ConvertToFileNode = ConvertToFileV11Node;
