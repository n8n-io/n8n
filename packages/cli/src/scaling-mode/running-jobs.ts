import { Service } from 'typedi';
import type { IRun } from 'n8n-workflow';
import type PCancelable from 'p-cancelable';
import type { JobId } from './types';

@Service()
export class RunningJobs {
	private readonly jobs: { [jobId: JobId]: PCancelable<IRun> } = {};

	add(jobId: JobId, job: PCancelable<IRun>) {
		this.jobs[jobId] = job;
	}

	remove(jobId: JobId) {
		delete this.jobs[jobId];
	}

	cancel(jobId: JobId) {
		this.jobs[jobId]?.cancel();
	}

	getAllIds(): JobId[] {
		return Object.keys(this.jobs);
	}
}
