import type { ScheduledJob, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';

/**
 * A due, enabled interval job. Each call gets a distinct sequential name.
 *
 * Self-owned by default (`ownerType: 'system-task'`, `ownerId` = its own name).
 * Override the owner columns for a test that needs jobs to share one.
 */
export const createDueJobFactory = (
	jobRepo: ScheduledJobRepository,
	taskType: string,
	namePrefix: string,
	now = Date.now,
) => {
	let seq = 0;
	return async (overrides: Partial<ScheduledJob> = {}) => {
		const name = `${namePrefix}-${++seq}`;
		return await jobRepo.save(
			jobRepo.create({
				name,
				...selfOwned(name),
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

/** The owner columns of a self-owned job: nothing outside the row owns it. */
export const selfOwned = (name: string) => ({
	ownerType: 'system-task',
	ownerId: name,
	ownerMemberId: null,
});

/** The owner columns of a job one workflow trigger node provisioned. */
export const workflowOwned = (workflowId: string, nodeId: string) => ({
	ownerType: 'workflow',
	ownerId: workflowId,
	ownerMemberId: nodeId,
});
