import { ExecutionLedger, toEndedFactsFromCancel } from '@n8n/backend-services';
import type { CanceledExecution } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionStatus } from 'n8n-workflow';

/**
 * Marks executions as `canceled`. A cancel write runs no execution lifecycle hooks,
 * so the ledger `ended` rows are recorded from here.
 */
@Service()
export class ExecutionCancelService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly executionLedger: ExecutionLedger,
	) {}

	/** `recorded` settles once the `ended` rows are written, for a caller that is about to exit. */
	async markAsCanceled(
		executionIds: string[],
		fromStatuses?: readonly ExecutionStatus[],
	): Promise<{ canceled: CanceledExecution[]; recorded: Promise<void> }> {
		const canceled = await this.executionRepository.markAsCanceled(executionIds, fromStatuses);
		return { canceled, recorded: this.recordEnded(canceled) };
	}

	/** For a caller whose own write moved the runs to `canceled`. */
	async recordEnded(executions: CanceledExecution[]): Promise<void> {
		if (!this.executionLedger.isEnabled || executions.length === 0) return;

		await this.executionLedger.recordEndedInSequence(executions.map(toEndedFactsFromCancel));
	}
}
