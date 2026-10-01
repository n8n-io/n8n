import { JobHandedBackError } from '@/errors/job-handed-back.error';

import type { Job, JobQueue } from './scaling.types';

function raiseAttemptsForHandBack(job: Job) {
	job.opts.attempts = job.attemptsMade + 2;
}

/** Fails the job so that Bull retries it under the same id, without publishing a failure. */
export function handBackJob(job: Job): never {
	raiseAttemptsForHandBack(job);
	throw new JobHandedBackError(job.id.toString());
}

export function getLockToken(queue: JobQueue): string | undefined {
	const token: unknown = Reflect.get(queue, 'token');
	return typeof token === 'string' ? token : undefined;
}

export async function handBackUnstartedJobs(
	queue: JobQueue,
	token: string,
	isStarted: (jobId: string) => boolean,
	onError?: (jobId: string, error: unknown) => void,
): Promise<string[]> {
	const activeJobs = await queue.getActive();

	const pipeline = queue.client.pipeline();
	for (const job of activeJobs) pipeline.get(job.lockKey());
	const locks = (await pipeline.exec()) ?? [];

	const unstartedJobs = activeJobs.filter((job, index) => {
		const [error, lockValue] = locks[index] ?? [];
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
