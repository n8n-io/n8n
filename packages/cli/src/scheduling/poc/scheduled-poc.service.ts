import { Logger } from '@n8n/backend-common';
import { Scheduled } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter } from '@n8n/scheduler';

import { DurableJobProvisioner } from '../durable-job-provisioner';

const POC_TASK_TYPE = 'poc-heartbeat';
const POC_INTERVAL_SECONDS = 30;

/**
 * End-to-end POC of the `@Scheduled` decorator: one class both declares a task
 * handler (via the decorator) and provisions a job that fires it, gated by
 * `N8N_SCHEDULER_POC_ENABLED`.
 */
@Service()
export class ScheduledPocService {
	constructor(
		private readonly logger: Logger,
		private readonly jobProvisioner: DurableJobProvisioner,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	@Scheduled({ type: POC_TASK_TYPE, instanceTypes: ['main'] })
	// eslint-disable-next-line @typescript-eslint/require-await -- async by TaskHandler contract
	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		this.logger.info('POC heartbeat fired', { taskId: task.id, scheduledFor: task.scheduledFor });
		return report.dispatched();
	}

	async provisionJob(): Promise<void> {
		await this.jobProvisioner.provision('poc-workflow', 'poc-node', POC_TASK_TYPE, {}, [
			{
				name: 'poc-heartbeat',
				schedule: { kind: 'interval', intervalSeconds: POC_INTERVAL_SECONDS },
				firstRunAt: new Date(Date.now() + POC_INTERVAL_SECONDS * 1000),
			},
		]);
		this.logger.info('POC heartbeat job provisioned', { intervalSeconds: POC_INTERVAL_SECONDS });
	}
}
