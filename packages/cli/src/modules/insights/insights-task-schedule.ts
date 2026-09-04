import type { IntervalDefinition } from '@n8n/constants';
import { ScheduledJobKind } from '@n8n/constants';

/**
 * An interval schedule of `seconds`, rounded to the whole second the scheduler
 * requires and never below one second. A configured cadence converted to
 * seconds can be fractional, and the scheduler refuses to plan such a schedule.
 */
export function intervalSchedule(seconds: number): IntervalDefinition {
	return {
		kind: ScheduledJobKind.Interval,
		intervalSeconds: Math.max(1, Math.round(seconds)),
	};
}
