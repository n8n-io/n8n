import { Service } from 'typedi';
import type { IRun } from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

@Service()
export class RunningJobs {
	private readonly jobs: { [jobId: string]: PCancelable<IRun> } = {};

	add(jobId: string, job: PCancelable<IRun>) {
		this.jobs[jobId] = job;
	}

	remove(jobId: string) {
		delete this.jobs[jobId];
	}

	cancel(jobId: string) {
		this.jobs[jobId]?.cancel();
	}

	getAllIds(): string[] {
		return Object.keys(this.jobs);
	}
}
