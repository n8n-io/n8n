import { SchedulerConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { clusterTarget, intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskSchedule } from '@n8n/decorators';

import { WorkflowStatisticsRollupService } from './workflow-statistics-rollup.service';

const ROLLUP_INTERVAL_SECONDS = 5;

/**
 * Folds the pending workflow statistics increments into the counters, and
 * fires the first-occurrence milestone events.
 */
@SystemTask()
export class WorkflowStatisticsRollupTask implements SystemTask {
	readonly name = 'workflow-statistics-rollup';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(ROLLUP_INTERVAL_SECONDS);

	readonly target = clusterTarget({
		scheduler: { retryOnFailure: true },
		leaderTimer: {
			/** Increments pile up while no instance is the leader, so a backlog is waiting. */
			runOnTakeover: true,
		},
	});

	private readonly runBudgetMs: number;

	constructor(
		private readonly rollupService: WorkflowStatisticsRollupService,
		schedulerConfig: SchedulerConfig,
	) {
		// Ends a run before the next occurrence, so a backlog does not cause overlap skips.
		// It also ends before a lease too short for the heartbeat to renew in time.
		this.runBudgetMs =
			(Math.min(ROLLUP_INTERVAL_SECONDS, schedulerConfig.leaseDurationSeconds) - 1) *
			Time.seconds.toMilliseconds;
	}

	async run(signal: AbortSignal): Promise<void> {
		await this.rollupService.rollup(signal, this.runBudgetMs);
	}
}
