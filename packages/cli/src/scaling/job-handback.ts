import { JobHandedBackError } from '@/errors/job-handed-back.error';

import type { Job, JobQueue } from './scaling.types';

function raiseAttemptsForHandBack(job: Job) {
	// Bull counts this attempt before the check, and does not store the new limit for the next worker.
	job.opts.attempts = job.attemptsMade + 2;
}

async function placeAtFrontOfBand(job: Job) {
	try {
		const { priority } = job.opts;
		if (typeof priority !== 'number' || !(priority > 0)) return;
		await job.queue.client.hset(job.queue.toKey(String(job.id)), 'priority', priority - 0.5);
	} catch {}
}

/** Fails the job so that Bull retries it under the same id, without publishing a failure. */
export async function handBackJob(job: Job): Promise<never> {
	raiseAttemptsForHandBack(job);
	await placeAtFrontOfBand(job);
	throw new JobHandedBackError(job.id.toString());
}

/** Returns the token that Bull locks this queue's jobs with, which Bull's types do not expose. */
export function getLockToken(queue: JobQueue): string | undefined {
	const token: unknown = Reflect.get(queue, 'token');
	return typeof token === 'string' ? token : undefined;
}

/** Hands back the active jobs that this token locked but whose handler never ran. */
export async function handBackUnstartedJobs(
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

	const handedBack: string[] = [];

	for (const job of unstartedJobs) {
		const jobId = String(job.id);
		raiseAttemptsForHandBack(job);
		try {
			await job.moveToFailed(new JobHandedBackError(jobId));
			handedBack.push(jobId);
		} catch (error) {
			onError?.(jobId, error);
		}
	}

	return handedBack;
}
