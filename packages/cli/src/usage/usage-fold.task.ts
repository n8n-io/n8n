import { SchedulerConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type {
	SystemTaskEffects,
	SystemTaskPlacement,
	SystemTaskRunContext,
	SystemTaskSchedule,
} from '@n8n/decorators';

import { UsageFoldService } from './usage-fold.service';

const FOLD_INTERVAL_SECONDS = 5;

/** Ends a run before the next occurrence, so a backlog does not cause overlap skips. */
const IN_MEMORY_RUN_BUDGET_MS = (FOLD_INTERVAL_SECONDS - 1) * Time.seconds.toMilliseconds;

/** Folds queued usage facts into the ledger and the totals, on Postgres and SQLite. */
@SystemTask()
export class UsageFoldTask implements SystemTask {
	readonly name = 'usage-fold';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(FOLD_INTERVAL_SECONDS);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		/** Facts pile up while no instance is the leader, so a backlog is waiting. */
		runOnTakeover: true,
	};

	private readonly durableRunBudgetMs: number;

	constructor(
		private readonly foldService: UsageFoldService,
		schedulerConfig: SchedulerConfig,
	) {
		// Leave one second for a slower batch. The durable lease is not renewed during a run.
		this.durableRunBudgetMs =
			(Math.min(FOLD_INTERVAL_SECONDS, schedulerConfig.leaseDurationSeconds) - 1) *
			Time.seconds.toMilliseconds;
	}

	async run(signal: AbortSignal, { durable }: SystemTaskRunContext): Promise<void> {
		await this.foldService.fold(
			signal,
			durable ? this.durableRunBudgetMs : IN_MEMORY_RUN_BUDGET_MS,
		);
	}
}
