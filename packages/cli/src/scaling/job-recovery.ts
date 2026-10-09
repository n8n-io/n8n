import type { Job } from './scaling.types';

/** The sweep keeps this record under the original ID, including after repeated recovery. */
export const jobRecoveryKey = (job: Job) => job.queue.toKey(`recovery:${job.id}`);

export async function readJobRecovery(job: Job) {
	const recovery = await job.queue.client.hgetall(jobRecoveryKey(job));
	return { jobId: recovery?.jobId, failedReason: recovery?.failedReason };
}

/** Freeze further recovery and read the latest ID in one Redis operation. */
export async function cancelJobRecovery(job: Job) {
	const jobId = await job.queue.client.eval(
		`redis.call("HSET", KEYS[1], "cancelled", "1")
return redis.call("HGET", KEYS[1], "jobId")`,
		1,
		jobRecoveryKey(job),
	);
	return typeof jobId === 'string' ? jobId : undefined;
}

export async function clearJobRecovery(job: Job) {
	await job.queue.client.del(jobRecoveryKey(job));
}
