import type { ExecutionStore } from '../execution';
import type { Detector, Finding } from './reconciliation.types';

/**
 * Finds the executions that are still `queued` after their `stale_after` time.
 * The `execution:enqueued` event of such an execution was lost, or the
 * orchestration worker has not handled it yet.
 */
export class QueuedExecutionDetector implements Detector {
	readonly name = 'queued-execution';

	constructor(
		private readonly executionStore: ExecutionStore,
		readonly intervalMs: number,
		private readonly batchSize: number,
	) {}

	async detect(at: Date): Promise<Finding[]> {
		const executions = await this.executionStore.findStaleQueuedExecutions(at, this.batchSize);
		return executions.map(({ id, staleAfter }) => ({
			kind: 'execution-queued-no-message',
			executionId: id,
			staleAfter,
		}));
	}
}
