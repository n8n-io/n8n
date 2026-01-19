/**
 * Date & Time Node - Version 1
 * Allows you to manipulate date and time values
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface DateTimeV1Config {
	action?: 'calculate' | 'format' | Expression<string>;
/**
 * The value that should be converted
 * @displayOptions.show { action: ["format"] }
 */
		value: string | Expression<string>;
/**
 * Name of the property to which to write the converted date
 * @displayOptions.show { action: ["format"] }
 * @default data
 */
		dataPropertyName: string | Expression<string>;
/**
 * Whether a predefined format should be selected or custom format entered
 * @displayOptions.show { action: ["format"] }
 * @default false
 */
		custom?: boolean | Expression<boolean>;
/**
 * The format to convert the date to
 * @displayOptions.show { action: ["format"], custom: [true] }
 */
		toFormat?: string | Expression<string>;
	options?: Record<string, unknown>;
	operation: 'add' | 'subtract' | Expression<string>;
/**
 * E.g. enter “10” then select “Days” if you want to add 10 days to Date Value.
 * @displayOptions.show { action: ["calculate"] }
 * @default 0
 */
		duration: number | Expression<number>;
/**
 * Time unit for Duration parameter above
 * @displayOptions.show { action: ["calculate"] }
 * @default days
 */
		timeUnit: 'quarters' | 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface DateTimeV1NodeBase {
	type: 'n8n-nodes-base.dateTime';
	version: 1;
}

export type DateTimeV1Node = DateTimeV1NodeBase & {
	config: NodeConfig<DateTimeV1Config>;
};

export type DateTimeV1Node = DateTimeV1Node;