import { InvalidScheduleError } from '../errors';
import type { Schedule } from '../types';
import { validateCron } from './kinds/cron';
import { validateInterval } from './kinds/interval';
import { validateOneOff } from './kinds/one-off';
import { validateRecurringCron } from './kinds/recurring-cron';

/**
 * Validates a schedule, throwing on the first problem. Safe to call before
 * saving a schedule or computing its next run.
 * @param schedule The schedule to validate.
 * @throws {InvalidScheduleError} When the schedule is malformed.
 */
export function validateSchedule(schedule: Schedule): void {
	switch (schedule.kind) {
		case 'cron':
			return validateCron(schedule);
		case 'recurring_cron':
			return validateRecurringCron(schedule);
		case 'interval':
			return validateInterval(schedule);
		case 'one_off':
			return validateOneOff(schedule);
		default: {
			const exhaustive: never = schedule;
			throw new InvalidScheduleError(
				`Unknown schedule kind: ${JSON.stringify((exhaustive as Schedule).kind)}`,
			);
		}
	}
}
