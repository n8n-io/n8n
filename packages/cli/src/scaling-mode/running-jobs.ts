import { Service } from 'typedi';
import type { JobId, RunningJobProps, RunningJobSummary } from './types';

@Service()
export class RunningJobs {
	private readonly jobs: { [jobId: JobId]: RunningJobProps } = {};

	set(jobId: JobId, props: RunningJobProps) {
		this.jobs[jobId] = props;
	}

	clear(jobId: JobId) {
		delete this.jobs[jobId];
	}

	cancel(jobId: JobId) {
		this.jobs[jobId]?.run.cancel();
	}

	getIds(): JobId[] {
		return Object.keys(this.jobs);
	}

	getSummaries(): RunningJobSummary[] {
		return Object.values(this.jobs).map(({ run, ...props }) => props);
	}
}
