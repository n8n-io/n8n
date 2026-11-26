import {
	WorkflowStatisticsRepository,
	type AfterFoldCommit,
	type ExecutionLedgerFoldStep,
	type ExecutionLedgerRow,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { toStatisticsIncrements } from './workflow-statistics.increments';
import { WorkflowStatisticsService } from './workflow-statistics.service';

/** Feeds the `workflow_statistics` counters, which the licence reads, from the ledger fold. */
@Service()
export class WorkflowStatisticsFoldStep implements ExecutionLedgerFoldStep {
	readonly name = 'workflow_statistics';

	constructor(
		private readonly repository: WorkflowStatisticsRepository,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
		private readonly errorReporter: ErrorReporter,
	) {}

	async fold(
		rows: readonly ExecutionLedgerRow[],
		ctx: OperationContext,
	): Promise<AfterFoldCommit | undefined> {
		const increments = toStatisticsIncrements(rows);
		if (increments.length === 0) return undefined;

		const firstOccurrences = await this.repository.addIncrements(increments, ctx);
		if (firstOccurrences.length === 0) return undefined;

		return async () => {
			for (const { name, workflowId, workflowName, firstEventMs } of firstOccurrences) {
				// One failed milestone must not drop the ones after it.
				try {
					await this.workflowStatisticsService.emitFirstOccurrenceEvent(
						name,
						workflowId,
						workflowName,
						firstEventMs,
					);
				} catch (error) {
					this.errorReporter.error(error, { shouldBeLogged: true });
				}
			}
		};
	}
}
