import { Time } from '@n8n/constants';

import { InvalidScheduleError } from '../../errors';
import type { IntervalSchedule, ScheduledJob } from '../../types';
import { required } from '../field';

/**
 * Checks that an interval schedule has a positive whole number of seconds.
 * @param schedule The interval schedule to check.
 * @throws {InvalidScheduleError} When the interval is not a positive integer.
 */
export function validateInterval(schedule: IntervalSchedule): void {
	if (!Number.isInteger(schedule.intervalSeconds) || schedule.intervalSeconds <= 0) {
		throw new InvalidScheduleError(
			`interval.intervalSeconds must be a positive integer, got ${JSON.stringify(schedule.intervalSeconds)}`,
		);
	}
}

/**
 * The next interval fire after `after`: `after` plus the interval. Counts real
 * elapsed time, so daylight-saving changes never shift a fire.
 * @param schedule The interval schedule.
 * @param after The previous occurrence.
 * @returns The next fire time.
 */
export function intervalNextRun(schedule: IntervalSchedule, after: Date): Date {
	return new Date(after.getTime() + schedule.intervalSeconds * Time.seconds.toMilliseconds);
}

/**
 * Every interval fire starting at `first`, oldest first.
 * @param first The first fire to yield.
 * @returns An endless generator of fire times.
 */
export function* intervalOccurrences(schedule: IntervalSchedule, first: Date): Generator<Date> {
	let previous = first;
	yield previous;
	for (;;) {
		previous = intervalNextRun(schedule, previous);
		yield previous;
	}
}

/**
 * Builds an interval schedule from a job.
 * @param job The job to build from.
 * @returns The interval schedule.
 * @throws {CorruptStorageRowError} When the interval field is unset.
 */
export function resolveInterval(job: ScheduledJob): IntervalSchedule {
	return { kind: 'interval', intervalSeconds: required(job, 'intervalSeconds') };
}
