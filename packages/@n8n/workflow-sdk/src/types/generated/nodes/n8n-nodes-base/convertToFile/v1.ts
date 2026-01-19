/**
 * Convert to File Node - Version 1
 * Convert JSON data to binary data
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ConvertToFileV1Config {
	operation?: 'csv' | 'html' | 'iCal' | 'toJson' | 'ods' | 'rtf' | 'toText' | 'xls' | 'xlsx' | 'toBinary' | Expression<string>;
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

interface ConvertToFileV1NodeBase {
	type: 'n8n-nodes-base.convertToFile';
	version: 1;
}

export type ConvertToFileV1Node = ConvertToFileV1NodeBase & {
	config: NodeConfig<ConvertToFileV1Config>;
};

export type ConvertToFileV1Node = ConvertToFileV1Node;