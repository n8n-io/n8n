import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';

/**
 * A system task with no owning workflow, firing on a fixed interval.
 * Idempotent by construction: re-running it only bumps an in-memory counter,
 * so it needs no fencing and always reports `dispatched()`.
 */
export const HEARTBEAT_TASK_TYPE = 'system:heartbeat';

@Service()
export class HeartbeatTaskHandler implements TaskHandler {
	readonly taskType = HEARTBEAT_TASK_TYPE;

	private fireCount = 0;

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		this.fireCount++;
		this.logger.debug('System-task heartbeat fired', {
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
