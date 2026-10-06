import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import {
	ROLLUP_INTERVAL_SECONDS,
	WorkflowStatisticsRollupService,
} from './workflow-statistics-rollup.service';

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
		durable: false,
		/** Increments pile up while no instance is the leader, so a backlog is waiting. */
		runOnTakeover: true,
	};

	constructor(private readonly rollupService: WorkflowStatisticsRollupService) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.rollupService.rollup(signal);
	}
}
