import { Service } from '@n8n/di';
import { CronJob } from 'cron';
import type { CronExpression, Workflow } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';

@Service()
export class ScheduledTaskManager {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	readonly cronJobs = new Map<string, CronJob[]>();

	registerCron(workflow: Workflow, cronExpression: CronExpression, onTick: () => void) {
		const cronJob = new CronJob(
			cronExpression,
			() => {
				if (this.instanceSettings.isLeader) onTick();
			},
			undefined,
			true,
			workflow.timezone,
		);
		const cronJobsForWorkflow = this.cronJobs.get(workflow.id);
		if (cronJobsForWorkflow) {
			cronJobsForWorkflow.push(cronJob);
		} else {
			this.cronJobs.set(workflow.id, [cronJob]);
		}
	}

	deregisterCrons(workflowId: string) {
		const cronJobs = this.cronJobs.get(workflowId) ?? [];
		while (cronJobs.length) {
			const cronJob = cronJobs.pop();
			if (cronJob) cronJob.stop();
		}
	}

	deregisterAllCrons() {
		for (const workflowId of Object.keys(this.cronJobs)) {
			this.deregisterCrons(workflowId);
		}
	}
}
