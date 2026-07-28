import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';

/**
 * Not a real system task: a stand-in that exercises `provisionSystemJob` end
 * to end, fires on a fixed interval, and is idempotent by construction, so it
 * needs no fencing and always reports `dispatched()`.
 */
export const EXAMPLE_SYSTEM_TASK_TYPE = 'system:example';

@Service()
export class ExampleSystemTaskHandler implements TaskHandler {
	readonly taskType = EXAMPLE_SYSTEM_TASK_TYPE;

	private fireCount = 0;

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		this.fireCount++;
		this.logger.debug('Example system task fired', {
			taskId: task.id,
			jobId: task.jobId,
			scheduledFor: task.scheduledFor.toISOString(),
			fireCount: this.fireCount,
		});
		return report.dispatched();
	}

	/** Times this handler has fired since process start. */
	getFireCount(): number {
		return this.fireCount;
	}
}
