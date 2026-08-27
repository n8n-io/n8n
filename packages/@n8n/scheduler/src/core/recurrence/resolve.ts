import { CorruptStorageRowError } from '../errors';
import type { Schedule, ScheduledJob } from '../types';
import { resolveCron } from './kinds/cron';
import { resolveInterval } from './kinds/interval';
import { resolveOneOff } from './kinds/one-off';
import { resolveRecurringCron } from './kinds/recurring-cron';

/**
 * Builds the schedule an in-memory job uses from its stored row, filling a
 * missing timezone with the instance default.
 *
 * Runs at plan time under the materializer's per-job error isolation: a row
 * missing a column its kind needs (corrupt or hand-edited) throws
 * {@link CorruptStorageRowError} and defers just that job.
 * @param job The stored job row.
 * @param defaultTimezone Instance default for a row with no timezone.
 * @returns The schedule for that job.
 * @throws {CorruptStorageRowError} On a corrupt row: an unknown kind or a
 * missing column.
 */
export function resolveSchedule(job: ScheduledJob, defaultTimezone: string): Schedule {
	switch (job.kind) {
		case 'cron':
			return resolveCron(job, defaultTimezone);
		case 'recurring_cron':
			return resolveRecurringCron(job, defaultTimezone);
		case 'interval':
			return resolveInterval(job);
		case 'one_off':
			return resolveOneOff(job);
		default: {
			const exhaustive: never = job.kind;
			throw new CorruptStorageRowError(
				`scheduled_job ${job.id} has unknown kind '${String(exhaustive)}'`,
			);
		}
	}
}
