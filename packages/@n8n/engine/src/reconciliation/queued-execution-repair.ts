import type { ExecutionStore } from '../execution';
import type { OrchestrationMessage, WorkQueue } from '../queue';
import type { Finding, Repair } from './reconciliation.types';

type Kind = 'execution-queued-no-message';

/**
 * Publishes `execution:enqueued` to the orchestration queue again for an
 * execution that is still `queued`.
 *
 * A second event for an execution whose first event is only slow does no
 * harm: the start handler claims the execution with a compare-and-set, so it
 * ignores the event that arrives second.
 */
export class QueuedExecutionRepair implements Repair<Kind> {
	readonly kind = 'execution-queued-no-message';

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
	) {}

	async apply({ executionId, staleAfter }: Extract<Finding, { kind: Kind }>): Promise<boolean> {
		// The renewal moves `stale_after` forward, so the detector does not return
		// this execution again before the new event had time to be handled.
		const renewed = await this.executionStore.renewQueuedExecution(executionId, staleAfter);
		if (!renewed) return false;

		await this.orchestrationQueue.publish({ type: 'execution:enqueued', executionId });
		return true;
	}
}
