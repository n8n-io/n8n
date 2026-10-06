import { JobReturnedToQueueError } from '@/errors/job-returned-to-queue.error';

import type { Job } from './scaling.types';

function grantRetryAttempt(job: Job) {
	// Bull counts this attempt before the check, and does not store the new limit for the next worker.
	job.opts.attempts = job.attemptsMade + 2;
}

/** Makes Bull's retry put the job ahead of the other jobs with the same priority. */
async function moveToFrontOfPriority(job: Job) {
	try {
		const { priority } = job.opts;
		if (typeof priority !== 'number' || !(priority > 0)) return;
		// Bull's retry reads the stored priority and inserts behind equal scores, so 0.5 less puts the job first.
		await job.queue.client.hset(job.queue.toKey(String(job.id)), 'priority', priority - 0.5);
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
