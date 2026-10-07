import type { Logger } from '@n8n/backend-common';

import { JobReturnedToQueueError } from '@/errors/job-returned-to-queue.error';

import type { Job } from './scaling.types';

function grantRetryAttempt(job: Job) {
	// Bull counts this attempt before the check, and does not store the new limit for the next worker.
	job.opts.attempts = job.attemptsMade + 2;
}

/** Makes Bull's retry put the job ahead of the other jobs with the same priority. */
async function moveToFrontOfPriority(job: Job, logger: Logger) {
	try {
		const { priority } = job.opts;
		if (typeof priority !== 'number' || !(priority > 0)) return;
		// Bull's retry reads the stored priority and inserts behind equal scores, so 0.5 less puts the job first.
		await job.queue.client.hset(job.queue.toKey(String(job.id)), 'priority', priority - 0.5);
	} catch (error) {
		logger.warn(
			`Could not move job ${job.id} to the front of its priority, so it will run after the jobs with the same priority`,
			{ jobId: job.id, error },
		);
	}
}

/** Fails the job so that Bull retries it under the same id, without publishing a failure. */
export async function returnJobToQueue(job: Job, logger: Logger): Promise<never> {
	grantRetryAttempt(job);
	await moveToFrontOfPriority(job, logger);
	throw new JobReturnedToQueueError(job.id.toString());
}
