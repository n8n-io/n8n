import { JobReturnedToQueueError } from '@/errors/job-returned-to-queue.error';

import type { Job, JobQueue } from './scaling.types';

function grantRetryAttempt(job: Job) {
	// Bull counts this attempt before the check, and does not store the new limit for the next worker.
	job.opts.attempts = job.attemptsMade + 2;
}

const SET_PRIORITY_IF_LOCKED = `
if redis.call('GET', KEYS[2]) == ARGV[1] then
	redis.call('HSET', KEYS[1], 'priority', ARGV[2])
end`;

/** Makes Bull's retry put the job ahead of the other jobs with the same priority. */
async function moveToFrontOfPriority(job: Job, token?: string) {
	try {
		const { priority } = job.opts;
		if (typeof priority !== 'number' || !(priority > 0)) return;
		const jobKey = job.queue.toKey(String(job.id));
		// Bull's retry reads the stored priority and inserts behind equal scores, so 0.5 less puts the job first.
		if (token === undefined) {
			await job.queue.client.hset(jobKey, 'priority', priority - 0.5);
			return;
		}
		// A job whose lock expired may already be failed and deleted, and a plain write would recreate its hash.
		await job.queue.client.eval(
			SET_PRIORITY_IF_LOCKED,
			2,
			jobKey,
			job.lockKey(),
			token,
			priority - 0.5,
		);
	} catch {
		// Without the write, Bull still retries the job, only behind the jobs with the same priority.
	}
}

/** Fails the job so that Bull retries it under the same id, without publishing a failure. */
export async function returnJobToQueue(job: Job): Promise<never> {
	grantRetryAttempt(job);
	await moveToFrontOfPriority(job);
	throw new JobReturnedToQueueError(job.id.toString());
}

/** Returns the token that Bull locks this queue's jobs with, which Bull's types do not expose. */
export function getLockToken(queue: JobQueue): string | undefined {
	const token: unknown = Reflect.get(queue, 'token');
	return typeof token === 'string' ? token : undefined;
}

/** Returns to the queue the active jobs that this token locked but whose handler never ran. */
export async function returnUnstartedJobsToQueue(
	queue: JobQueue,
	token: string,
	isStarted: (jobId: string) => boolean,
	onError?: (jobId: string, error: unknown) => void,
): Promise<string[]> {
	// A job can be removed between Bull's active list and this reading it back, leaving a null entry.
	const activeJobs = (await queue.getActive()).filter(
		(job): job is Job => job !== null && job !== undefined,
	);

	const pipeline = queue.client.pipeline();
	for (const job of activeJobs) pipeline.get(job.lockKey());
	const locks = (await pipeline.exec()) ?? [];

	const unstartedJobs = activeJobs.filter((job, index) => {
		const [error, lockValue] = locks[index] ?? [];
		// moveToFailed writes the job hash before the lock check, so only touch a job this token holds.
		return !error && lockValue === token && !isStarted(String(job.id));
	});

	const returned: string[] = [];

	for (const job of unstartedJobs) {
		const jobId = String(job.id);
		grantRetryAttempt(job);
		await moveToFrontOfPriority(job, token);
		try {
			await job.moveToFailed(new JobReturnedToQueueError(jobId));
			returned.push(jobId);
		} catch (error) {
			onError?.(jobId, error);
		}
	}

	return returned;
}
