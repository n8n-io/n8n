import { isBillableExecution } from '@n8n/backend-services';
import {
	LedgerParticipant,
	WorkflowStatisticsRepository,
	type AfterFoldCommit,
	type ExecutionLedgerParticipant,
	type ExecutionLedgerRow,
	type OperationContext,
	type WorkflowStatisticsIncrement,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import {
	getStatisticsNameForCompletedRun,
	WorkflowStatisticsService,
} from './workflow-statistics.service';

/** Folds finished runs into `workflow_statistics`, then fires first-occurrence milestones. */
@LedgerParticipant()
@Service()
export class WorkflowStatisticsLedgerParticipant implements ExecutionLedgerParticipant {
	readonly name = 'workflow-statistics';

	constructor(
		private readonly repository: WorkflowStatisticsRepository,
		private readonly statisticsService: WorkflowStatisticsService,
		private readonly errorReporter: ErrorReporter,
	) {}

	async fold(
		rows: ExecutionLedgerRow[],
		ctx: OperationContext,
	): Promise<AfterFoldCommit | undefined> {
		const increments = this.aggregate(rows);
		const firstOccurrences = await this.repository.addIncrements(ctx, increments);
		if (firstOccurrences.length === 0) return undefined;

		return async () => {
			for (const occurrence of firstOccurrences) {
				try {
					await this.statisticsService.emitFirstOccurrenceEvent(
						occurrence.name,
						occurrence.workflowId,
						occurrence.workflowName,
						occurrence.firstEventMs,
					);
				} catch (error) {
					this.errorReporter.error(error, { shouldBeLogged: true });
				}
			}
		};
	}

	private aggregate(rows: ExecutionLedgerRow[]): WorkflowStatisticsIncrement[] {
		const byCounter = new Map<string, WorkflowStatisticsIncrement>();

		for (const row of rows) {
			if (row.event !== 'finished' || row.status === null) continue;

			const outcome = { mode: row.mode, status: row.status };
			const source = row.source ?? undefined;
			const name = getStatisticsNameForCompletedRun(outcome, source);
			if (!name) continue;

			const key = `${row.workflowId}:${name}`;
			const increment = byCounter.get(key) ?? {
				workflowId: row.workflowId,
				name,
				count: 0,
				rootCount: 0,
				latestEvent: row.createdAt,
				firstEvent: row.createdAt,
				workflowName: row.workflowName,
			};
			increment.count += row.delta;
			increment.rootCount += isBillableExecution(outcome, source) ? row.delta : 0;
			if (row.createdAt >= increment.latestEvent) {
				increment.latestEvent = row.createdAt;
				increment.workflowName = row.workflowName ?? increment.workflowName;
			}
			if (row.createdAt < increment.firstEvent) increment.firstEvent = row.createdAt;
			byCounter.set(key, increment);
		}

		return [...byCounter.values()];
	}
}
