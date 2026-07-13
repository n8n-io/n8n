import type { ScheduledJob, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';

/** A due, enabled interval job. Each call gets a distinct sequential name. */
export const createDueJobFactory = (
	jobRepo: ScheduledJobRepository,
	taskType: string,
	namePrefix: string,
	now = Date.now,
) => {
	let seq = 0;
	return async (overrides: Partial<ScheduledJob> = {}) =>
		await jobRepo.save(
			jobRepo.create({
				name: `${namePrefix}-${++seq}`,
				taskType,
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date(now() - 1000),
				maxAttempts: 3,
				...overrides,
			}),
		);
};

/**
 * A pending, already-due occurrence, seeded directly so a test can drive the
 * claim/fire path without depending on a materialize pass. `index` offsets
 * `scheduledFor` so multiple occurrences of the same job get distinct
 * identities (the unique key is `(jobId, scheduledFor)`).
 */
export const seedDueTask = async (
	taskRepo: ScheduledTaskRepository,
	taskType: string,
	jobId: number,
	index = 0,
) => {
	const past = new Date(Date.now() - 1000 - index * 1000);
	return await taskRepo.save(
		taskRepo.create({
			jobId,
			taskType,
			payload: {},
			scheduledFor: past,
			runAt: past,
			status: 'pending',
			maxAttempts: 3,
		}),
	);
};
