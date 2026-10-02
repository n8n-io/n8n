import { JobHandedBackError } from '@/errors/job-handed-back.error';

import type { Job } from './scaling.types';

function raiseAttemptsForHandBack(job: Job) {
	// Bull counts this attempt before the check, and does not store the new limit for the next worker.
	job.opts.attempts = job.attemptsMade + 2;
}

/** Makes Bull's retry put the job ahead of the other jobs with its priority. */
async function placeAtFrontOfBand(job: Job) {
	try {
		const { priority } = job.opts;
		if (typeof priority !== 'number' || !(priority > 0)) return;
		// Bull's retry reads the stored priority and inserts behind equal scores; half a step keeps the band.
		await job.queue.client.hset(job.queue.toKey(String(job.id)), 'priority', priority - 0.5);
	} catch {
		// Without the write, Bull still retries the job, only at the back of its band.
	}
}

/** Fails the job so that Bull retries it under the same id, without publishing a failure. */
export async function handBackJob(job: Job): Promise<never> {
	raiseAttemptsForHandBack(job);
	await placeAtFrontOfBand(job);
	throw new JobHandedBackError(job.id.toString());
}
