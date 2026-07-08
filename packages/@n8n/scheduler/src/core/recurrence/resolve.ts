import type { CronExpression } from 'n8n-workflow';

import { CorruptStorageRowError } from '../errors';
import type { Schedule, ScheduledJob } from '../types';

/**
 * Assemble the `Schedule` union the recurrence math consumes from a job's flat
 * discriminator + per-kind columns, resolving a cron job's `null` timezone to
 * `defaultTimezone` (the instance default).
 *
 * Runs at plan time, under the materializer's per-job error isolation: a row
 * missing a column its kind guarantees (corrupt or hand-edited) throws
 * {@link CorruptStorageRowError} and defers that one job instead of failing the
 * whole pass.
 */
export function resolveSchedule(job: ScheduledJob, defaultTimezone: string): Schedule {
	switch (job.kind) {
		case 'cron':
			// The stored column is a plain varchar validated on write; narrow to the
			// branded type at this boundary.
			return {
				kind: 'cron',
				cronExpression: required(job, 'cronExpression') as CronExpression,
				timezone: job.timezone ?? defaultTimezone,
			};
		case 'interval':
			return { kind: 'interval', intervalSeconds: required(job, 'intervalSeconds') };
		case 'one_off':
			return { kind: 'one_off', fireAt: required(job, 'fireAt') };
	}
}

/** Read a column that the kind's CHECK constraint guarantees is set; a null here is a corrupt row. */
function required<K extends keyof ScheduledJob>(
	job: ScheduledJob,
	key: K,
): NonNullable<ScheduledJob[K]> {
	const value = job[key];
	if (value === null || value === undefined) {
		throw new CorruptStorageRowError(
			`scheduled_job ${job.id} of kind '${job.kind}' is missing '${String(key)}'`,
		);
	}
	return value as NonNullable<ScheduledJob[K]>;
}
