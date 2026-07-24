import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';

/**
 * PoC only: not one of n8n's real system tasks. Exists to prove the
 * generalised `DurableJobProvisioner.provisionSystemJob` path end to end with
 * a handler that has no owning workflow, registered the same way the
 * schedule-trigger node's handler is. See
 * `notes/builder/durable-scheduler/distributed-scheduler-system-tasks-batch1-spec.md`.
 *
 * Idempotent by construction (case 1 of that spec): re-running it changes
 * nothing but the in-memory counter, so it needs no fencing and always
 * reports `dispatched()`.
 */
export const POC_HEARTBEAT_TASK_TYPE = 'system:poc-heartbeat';

@Service()
export class PocHeartbeatTaskHandler implements TaskHandler {
	readonly taskType = POC_HEARTBEAT_TASK_TYPE;

	private fireCount = 0;

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		this.fireCount++;
		this.logger.debug('System-task PoC heartbeat fired', {
			taskId: task.id,
			jobId: task.jobId,
			scheduledFor: task.scheduledFor.toISOString(),
			fireCount: this.fireCount,
		});
		return report.dispatched();
	}

	/** Observability/test hook: how many times this handler has fired since process start. */
	getFireCount(): number {
		return this.fireCount;
	}
}
