import { SchedulerConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { ExecutionLedgerFoldService } from './execution-ledger-fold.service';

const FOLD_INTERVAL_SECONDS = 5;

/** Folds the execution ledger into its participants every few seconds. */
@SystemTask()
export class ExecutionLedgerFoldTask implements SystemTask {
	readonly name = 'execution-ledger-fold';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(FOLD_INTERVAL_SECONDS);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: {
			/** Rows pile up while no instance is the leader, so a backlog is waiting. */
			runOnTakeover: true,
		},
	});

	private readonly runBudgetMs: number;

	constructor(
		private readonly foldService: ExecutionLedgerFoldService,
		schedulerConfig: SchedulerConfig,
	) {
		// Ends a run before the next occurrence and before the scheduler lease runs out.
		this.runBudgetMs =
			(Math.min(FOLD_INTERVAL_SECONDS, schedulerConfig.leaseDurationSeconds) - 1) *
			Time.seconds.toMilliseconds;
	}

	async run(signal: AbortSignal): Promise<void> {
		await this.foldService.fold(signal, this.runBudgetMs);
	}
}
