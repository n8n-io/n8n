/**
 * Schedule Trigger Node Types
 *
 * Triggers the workflow on a given schedule
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/scheduletrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ScheduleTriggerV13Params {
	rule?: {
		interval?: Array<{
			field?:
				| 'seconds'
				| 'minutes'
				| 'hours'
				| 'days'
				| 'weeks'
				| 'months'
				| 'cronExpression'
				| Expression<string>;
			secondsInterval?: number | Expression<number>;
			minutesInterval?: number | Expression<number>;
			hoursInterval?: number | Expression<number>;
			daysInterval?: number | Expression<number>;
			weeksInterval?: number | Expression<number>;
			monthsInterval?: number | Expression<number>;
			triggerAtDayOfMonth?: number | Expression<number>;
			triggerAtDay?: Array<1 | 2 | 3 | 4 | 5 | 6 | 0>;
			triggerAtHour?:
				| 0
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6
				| 7
				| 8
				| 9
				| 10
				| 11
				| 12
				| 13
				| 14
				| 15
				| 16
				| 17
				| 18
				| 19
				| 20
				| 21
				| 22
				| 23
				| Expression<number>;
			triggerAtMinute?: number | Expression<number>;
			expression?: string | Expression<string>;
		}>;
	};
}

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

export type ScheduleTriggerV13Node = {
	type: 'n8n-nodes-base.scheduleTrigger';
	version: 1 | 1.1 | 1.2 | 1.3;
	config: NodeConfig<ScheduleTriggerV13Params>;
	credentials?: Record<string, never>;
	isTrigger: true;
};

export type ScheduleTriggerNode = ScheduleTriggerV13Node;
