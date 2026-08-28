import { InvalidScheduleError } from '../../errors';
import type { OneOffSchedule, ScheduledJob } from '../../types';
import { required } from '../field';

/**
 * Checks that a one-off schedule has a valid fire time.
 * @param schedule The one-off schedule to check.
 * @throws {InvalidScheduleError} When `fireAt` is not a valid Date.
 */
export function validateOneOff(schedule: OneOffSchedule): void {
	const fireAt: unknown = schedule.fireAt;
	if (!(fireAt instanceof Date) || Number.isNaN(fireAt.getTime())) {
		throw new InvalidScheduleError('one_off.fireAt must be a valid Date');
	}
}

/**
 * The one-off fire time, or `null` if it has already passed.
 * @param schedule The one-off schedule.
 * @param after The instant to fire after.
 * @returns `fireAt` when it is still ahead of `after`, otherwise `null`.
 */
export function oneOffNextRun(schedule: OneOffSchedule, after: Date): Date | null {
	return after.getTime() < schedule.fireAt.getTime() ? schedule.fireAt : null;
}

/**
 * The single fire of a one-off schedule: just `first`, then nothing.
 * @param first The one-off's fire time.
 * @returns A generator that yields `first` once.
 */
export function* oneOffOccurrences(first: Date): Generator<Date> {
	yield first;
}

/**
 * Builds a one-off schedule from a job.
 * @param job The job to build from.
 * @returns The one-off schedule.
 * @throws {CorruptStorageRowError} When the fire-time field is unset.
 */
export function resolveOneOff(job: ScheduledJob): OneOffSchedule {
	return { kind: 'one_off', fireAt: required(job, 'fireAt') };
}
