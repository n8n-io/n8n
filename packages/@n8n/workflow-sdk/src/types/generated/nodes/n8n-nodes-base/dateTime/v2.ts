/**
 * Date & Time Node - Version 2
 * Manipulate date and time values
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type DateTimeV2RoundDownConfig = {
	mode: 'roundDown';
/**
 * When deactivated, the time will be set to midnight
 * @displayOptions.show { operation: ["getCurrentDate"] }
 * @default true
 */
		includeTime?: boolean | Expression<boolean>;
/**
 * Name of the field to put the output in
 * @displayOptions.show { operation: ["getCurrentDate"] }
 * @default currentDate
 */
		outputFieldName?: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * The date that you want to change
 * @displayOptions.show { operation: ["addToDate"] }
 */
		magnitude: string | Expression<string>;
/**
 * Time unit for Duration parameter below
 * @displayOptions.show { operation: ["addToDate"] }
 * @default days
 */
		timeUnit: 'years' | 'quarters' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' | Expression<string>;
/**
 * The number of time units to add to the date
 * @displayOptions.show { operation: ["addToDate"] }
 * @default 0
 */
		duration?: number | Expression<number>;
/**
 * The date that you want to format
 * @displayOptions.show { operation: ["formatDate"] }
 */
		date?: string | Expression<string>;
/**
 * The format to convert the date to
 * @displayOptions.show { operation: ["formatDate"] }
 * @default MM/dd/yyyy
 */
		format?: 'custom' | 'MM/dd/yyyy' | 'yyyy/MM/dd' | 'MMMM dd yyyy' | 'MM-dd-yyyy' | 'yyyy-MM-dd' | 'X' | 'x' | Expression<string>;
	customFormat?: string | Expression<string>;
	toNearest?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | Expression<string>;
	startDate?: string | Expression<string>;
	endDate?: string | Expression<string>;
	units?: Array<'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond'>;
	part?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | Expression<string>;
};

export type DateTimeV2RoundUpConfig = {
	mode: 'roundUp';
/**
 * When deactivated, the time will be set to midnight
 * @displayOptions.show { operation: ["getCurrentDate"] }
 * @default true
 */
		includeTime?: boolean | Expression<boolean>;
/**
 * Name of the field to put the output in
 * @displayOptions.show { operation: ["getCurrentDate"] }
 * @default currentDate
 */
		outputFieldName?: string | Expression<string>;
	options?: Record<string, unknown>;
/**
 * The date that you want to change
 * @displayOptions.show { operation: ["addToDate"] }
 */
		magnitude: string | Expression<string>;
/**
 * Time unit for Duration parameter below
 * @displayOptions.show { operation: ["addToDate"] }
 * @default days
 */
		timeUnit: 'years' | 'quarters' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' | Expression<string>;
/**
 * The number of time units to add to the date
 * @displayOptions.show { operation: ["addToDate"] }
 * @default 0
 */
		duration?: number | Expression<number>;
/**
 * The date that you want to format
 * @displayOptions.show { operation: ["formatDate"] }
 */
		date?: string | Expression<string>;
/**
 * The format to convert the date to
 * @displayOptions.show { operation: ["formatDate"] }
 * @default MM/dd/yyyy
 */
		format?: 'custom' | 'MM/dd/yyyy' | 'yyyy/MM/dd' | 'MMMM dd yyyy' | 'MM-dd-yyyy' | 'yyyy-MM-dd' | 'X' | 'x' | Expression<string>;
	customFormat?: string | Expression<string>;
	to?: 'month' | Expression<string>;
	startDate?: string | Expression<string>;
	endDate?: string | Expression<string>;
	units?: Array<'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond'>;
	part?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | Expression<string>;
};

export type DateTimeV2Params =
	| DateTimeV2RoundDownConfig
	| DateTimeV2RoundUpConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type DateTimeV2Node = {
	type: 'n8n-nodes-base.dateTime';
	version: 2;
	config: NodeConfig<DateTimeV2Params>;
	credentials?: Record<string, never>;
};