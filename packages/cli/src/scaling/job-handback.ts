import { JobHandedBackError } from '@/errors/job-handed-back.error';

import type { Job } from './scaling.types';

/** Fails the job so that Bull retries it under the same id, without publishing a failure. */
export function handBackJob(job: Job): never {
	// Bull counts this attempt before the check, and does not store the new limit for the next worker.
	job.opts.attempts = job.attemptsMade + 2;
	throw new JobHandedBackError(job.id.toString());
}
