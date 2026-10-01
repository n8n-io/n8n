import { JobHandedBackError } from '@/errors/job-handed-back.error';

import type { Job } from './scaling.types';

export function handBackJob(job: Job): never {
	job.opts.attempts = job.attemptsMade + 2;
	throw new JobHandedBackError(job.id.toString());
}
