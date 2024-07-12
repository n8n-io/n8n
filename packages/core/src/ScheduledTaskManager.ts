import { Service } from 'typedi';
import { CronJob } from 'cron';
import type { CronExpression, Workflow } from 'n8n-workflow';

@Service()
export class ScheduledTaskManager {
	readonly cronJobs = new Map<string, CronJob[]>();

	registerCron(workflow: Workflow, cronExpression: CronExpression, onTick: () => void) {
		const cronJob = new CronJob(
			cronExpression as string,
			onTick,
			undefined,
			true,
			workflow.timezone,
		);
		if (!this.cronJobs.has(workflow.id)) this.cronJobs.set(workflow.id, []);
		this.cronJobs.get(workflow.id)!.push(cronJob);
	}

	deregisterCrons(workflowId: string) {
		const cronJobs = this.cronJobs.get(workflowId) ?? [];
		for (const cronJob of cronJobs) {
			cronJob.stop();
		}
	}

	deregisterAllCrons() {
		for (const workflowId of Object.keys(this.cronJobs)) {
			this.deregisterCrons(workflowId);
		}
	}
}
