import type { ErrorWorkflowStarter, ExecutionStore } from '../execution';
import type { Finding, Repair } from './reconciliation.types';

type Kind = 'execution-error-workflow-pending';

/**
 * Tries again to start the error execution of an ended execution.
 *
 * The claim moves the marker time forward first, so only one sweeper tries,
 * and a failed try waits for the new time. The error start checks the error
 * source link before it asks the host, so a start that already happened is not
 * repeated.
 */
export class PendingErrorWorkflowRepair implements Repair<Kind> {
	readonly kind = 'execution-error-workflow-pending';

	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly errorWorkflowStarter: ErrorWorkflowStarter,
	) {}

	async apply({ executionId, dueAt }: Extract<Finding, { kind: Kind }>): Promise<boolean> {
		const claimed = await this.executionStore.deferErrorWorkflow(executionId, dueAt);
		if (!claimed) return false;

		// Throws on a failure that a later try can fix. The sweeper logs it.
		await this.errorWorkflowStarter.start(executionId);
		return true;
	}
}
