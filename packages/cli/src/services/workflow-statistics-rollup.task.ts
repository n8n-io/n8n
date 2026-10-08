import { SchedulerConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskRunContext, SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowStatisticsRollupService } from './workflow-statistics-rollup.service';

const ROLLUP_INTERVAL_SECONDS = 5;

/** Ends a run before the next occurrence, so a backlog does not cause overlap skips. */
const IN_MEMORY_RUN_BUDGET_MS = (ROLLUP_INTERVAL_SECONDS - 1) * Time.seconds.toMilliseconds;

/**
 * Folds the pending workflow statistics increments into the counters, and
 * fires the first-occurrence milestone events.
 */
@SystemTask()
export class WorkflowStatisticsRollupTask implements SystemTask {
	readonly name = 'workflow-statistics-rollup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(ROLLUP_INTERVAL_SECONDS);

	readonly target = {
		scope: 'cluster',
		scheduler: { maxAttempts: 3 },
		leaderTimer: {
			/** Increments pile up while no instance is the leader, so a backlog is waiting. */
			runOnTakeover: true,
		},
	} satisfies SystemTaskTarget;

	private readonly durableRunBudgetMs: number;

	constructor(
		private readonly rollupService: WorkflowStatisticsRollupService,
		schedulerConfig: SchedulerConfig,
	) {
		// Leave one second for a slower batch. The durable lease is not renewed during a run.
		this.durableRunBudgetMs =
			(Math.min(ROLLUP_INTERVAL_SECONDS, schedulerConfig.leaseDurationSeconds) - 1) *
			Time.seconds.toMilliseconds;
	}

	async run(signal: AbortSignal, { runner }: SystemTaskRunContext): Promise<void> {
		await this.rollupService.rollup(
			signal,
			runner === 'scheduler' ? this.durableRunBudgetMs : IN_MEMORY_RUN_BUDGET_MS,
		);
	}
}
