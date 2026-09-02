import { CorruptStorageRowError } from '../errors';
import type { ScheduledJob } from '../types';

/**
 * Reads a job field that the job's kind guarantees is set, e.g. `cronExpression`
 * on a `cron` job. The resolvers use it to turn a field that is optional on the
 * general job into a non-null value once the kind has been checked.
 * @param job The job to read from.
 * @param key The field to read.
 * @returns The field value, guaranteed non-null.
 * @throws {CorruptStorageRowError} When the field is unset, meaning the stored
 * data is inconsistent with the job's kind.
 */
export function required<K extends keyof ScheduledJob>(
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
