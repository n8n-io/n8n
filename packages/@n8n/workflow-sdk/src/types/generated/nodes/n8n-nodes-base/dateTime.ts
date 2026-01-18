/**
 * Date & Time Node Types
 *
 * Manipulate date and time values
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/datetime/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type DateTimeV2RoundDownConfig = {
	mode: 'roundDown';
	/**
	 * When deactivated, the time will be set to midnight
	 * @default true
	 */
	includeTime?: boolean | Expression<boolean>;
	/**
	 * Name of the field to put the output in
	 * @default currentDate
	 */
	outputFieldName?: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The date that you want to change
	 */
	magnitude: string | Expression<string>;
	/**
	 * Time unit for Duration parameter below
	 * @default days
	 */
	timeUnit:
		| 'years'
		| 'quarters'
		| 'months'
		| 'weeks'
		| 'days'
		| 'hours'
		| 'minutes'
		| 'seconds'
		| 'milliseconds'
		| Expression<string>;
	/**
	 * The number of time units to add to the date
	 * @default 0
	 */
	duration?: number | Expression<number>;
	/**
	 * The date that you want to format
	 */
	date?: string | Expression<string>;
	/**
	 * The format to convert the date to
	 * @default MM/dd/yyyy
	 */
	format?:
		| 'custom'
		| 'MM/dd/yyyy'
		| 'yyyy/MM/dd'
		| 'MMMM dd yyyy'
		| 'MM-dd-yyyy'
		| 'yyyy-MM-dd'
		| 'X'
		| 'x'
		| Expression<string>;
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
	 * @default true
	 */
	includeTime?: boolean | Expression<boolean>;
	/**
	 * Name of the field to put the output in
	 * @default currentDate
	 */
	outputFieldName?: string | Expression<string>;
	options?: Record<string, unknown>;
	/**
	 * The date that you want to change
	 */
	magnitude: string | Expression<string>;
	/**
	 * Time unit for Duration parameter below
	 * @default days
	 */
	timeUnit:
		| 'years'
		| 'quarters'
		| 'months'
		| 'weeks'
		| 'days'
		| 'hours'
		| 'minutes'
		| 'seconds'
		| 'milliseconds'
		| Expression<string>;
	/**
	 * The number of time units to add to the date
	 * @default 0
	 */
	duration?: number | Expression<number>;
	/**
	 * The date that you want to format
	 */
	date?: string | Expression<string>;
	/**
	 * The format to convert the date to
	 * @default MM/dd/yyyy
	 */
	format?:
		| 'custom'
		| 'MM/dd/yyyy'
		| 'yyyy/MM/dd'
		| 'MMMM dd yyyy'
		| 'MM-dd-yyyy'
		| 'yyyy-MM-dd'
		| 'X'
		| 'x'
		| Expression<string>;
	customFormat?: string | Expression<string>;
	to?: 'month' | Expression<string>;
	startDate?: string | Expression<string>;
	endDate?: string | Expression<string>;
	units?: Array<'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond'>;
	part?: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | Expression<string>;
};

export type DateTimeV2Params = DateTimeV2RoundDownConfig | DateTimeV2RoundUpConfig;

export interface DateTimeV1Params {
	action?: 'calculate' | 'format' | Expression<string>;
	/**
	 * The value that should be converted
	 */
	value: string | Expression<string>;
	/**
	 * Name of the property to which to write the converted date
	 * @default data
	 */
	dataPropertyName: string | Expression<string>;
	/**
	 * Whether a predefined format should be selected or custom format entered
	 * @default false
	 */
	custom?: boolean | Expression<boolean>;
	/**
	 * The format to convert the date to
	 */
	toFormat?: string | Expression<string>;
	options?: Record<string, unknown>;
	operation: 'add' | 'subtract' | Expression<string>;
	/**
	 * E.g. enter “10” then select “Days” if you want to add 10 days to Date Value.
	 * @default 0
	 */
	duration: number | Expression<number>;
	/**
	 * Time unit for Duration parameter above
	 * @default days
	 */
	timeUnit:
		| 'quarters'
		| 'years'
		| 'months'
		| 'weeks'
		| 'days'
		| 'hours'
		| 'minutes'
		| 'seconds'
		| 'milliseconds'
		| Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type DateTimeV2Node = {
	type: 'n8n-nodes-base.dateTime';
	version: 2;
	config: NodeConfig<DateTimeV2Params>;
	credentials?: Record<string, never>;
};

export type DateTimeV1Node = {
	type: 'n8n-nodes-base.dateTime';
	version: 1;
	config: NodeConfig<DateTimeV1Params>;
	credentials?: Record<string, never>;
};

export type DateTimeNode = DateTimeV2Node | DateTimeV1Node;
