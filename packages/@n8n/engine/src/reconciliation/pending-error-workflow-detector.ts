import type { ExecutionStore } from '../execution';
import type { Detector, Finding } from './reconciliation.types';

/**
 * Finds the ended executions whose error execution is still due after the
 * marker time. The worker that ended such an execution crashed before the
 * start, or its try failed.
 */
export class PendingErrorWorkflowDetector implements Detector {
	readonly name = 'pending-error-workflow';

	constructor(
		private readonly executionStore: ExecutionStore,
		readonly intervalMs: number,
		private readonly batchSize: number,
	) {}

	async detect(at: Date): Promise<Finding[]> {
		const executions = await this.executionStore.findDueErrorWorkflows(at, this.batchSize);
		return executions.map(({ id, dueAt }) => ({
			kind: 'execution-error-workflow-pending',
			executionId: id,
			dueAt,
		}));
	}
}
