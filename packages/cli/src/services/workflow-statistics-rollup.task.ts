import { SchedulerConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type {
	SystemTaskEffects,
	SystemTaskPlacement,
	SystemTaskRunContext,
	SystemTaskSchedule,
} from '@n8n/decorators';

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

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = {
		scope: 'cluster',
		durable: true,
		/** Increments pile up while no instance is the leader, so a backlog is waiting. */
		runOnTakeover: true,
	};

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

	async run(signal: AbortSignal, { durable }: SystemTaskRunContext): Promise<void> {
		await this.rollupService.rollup(signal, durable ? this.durableRunBudgetMs : undefined);
	}
}
