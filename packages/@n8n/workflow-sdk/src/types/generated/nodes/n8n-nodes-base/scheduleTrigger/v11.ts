/**
 * Schedule Trigger Node - Version 1.1
 * Triggers the workflow on a given schedule
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ScheduleTriggerV11Params {
	rule?: {
		interval?: Array<{
			/** Trigger Interval
			 * @default days
			 */
			field?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'cronExpression' | Expression<string>;
			/** Number of seconds between each workflow trigger
			 * @hint Must be in range 1-59
			 * @displayOptions.show { field: ["seconds"] }
			 * @default 30
			 */
			secondsInterval?: number | Expression<number>;
			/** Number of minutes between each workflow trigger
			 * @hint Must be in range 1-59
			 * @displayOptions.show { field: ["minutes"] }
			 * @default 5
			 */
			minutesInterval?: number | Expression<number>;
			/** Number of hours between each workflow trigger
			 * @hint Must be in range 1-23
			 * @displayOptions.show { field: ["hours"] }
			 * @default 1
			 */
			hoursInterval?: number | Expression<number>;
			/** Number of days between each workflow trigger
			 * @hint Must be in range 1-31
			 * @displayOptions.show { field: ["days"] }
			 * @default 1
			 */
			daysInterval?: number | Expression<number>;
			/** Would run every week unless specified otherwise
			 * @displayOptions.show { field: ["weeks"] }
			 * @default 1
			 */
			weeksInterval?: number | Expression<number>;
			/** Would run every month unless specified otherwise
			 * @displayOptions.show { field: ["months"] }
			 * @default 1
			 */
			monthsInterval?: number | Expression<number>;
			/** The day of the month to trigger (1-31)
			 * @hint If a month doesn’t have this day, the node won’t trigger
			 * @displayOptions.show { field: ["months"] }
			 * @default 1
			 */
			triggerAtDayOfMonth?: number | Expression<number>;
			/** Trigger on Weekdays
			 * @displayOptions.show { field: ["weeks"] }
			 * @default [0]
			 */
			triggerAtDay?: Array<1 | 2 | 3 | 4 | 5 | 6 | 0>;
			/** The hour of the day to trigger
			 * @displayOptions.show { field: ["days", "weeks", "months"] }
			 * @default 0
			 */
			triggerAtHour?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | Expression<number>;
			/** The minute past the hour to trigger (0-59)
			 * @displayOptions.show { field: ["hours", "days", "weeks", "months"] }
			 * @default 0
			 */
			triggerAtMinute?: number | Expression<number>;
			/** Expression
			 * @hint Format: [Second] [Minute] [Hour] [Day of Month] [Month] [Day of Week]
			 * @displayOptions.show { field: ["cronExpression"] }
			 */
			expression?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type ScheduleTriggerV11Node = {
	type: 'n8n-nodes-base.scheduleTrigger';
	version: 1.1;
	config: NodeConfig<ScheduleTriggerV11Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};