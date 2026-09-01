import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { InsightsPruningService } from './insights-pruning.service';
import { intervalSchedule } from './insights-task-schedule';
import { InsightsConfig } from './insights.config';

/**
 * Deletes insights statistics older than the configured retention period, so
 * old data does not pile up forever.
 */
@SystemTask()
export class InsightsPruningTask implements SystemTask {
	readonly name = 'insights-pruning';

	readonly schedule: SystemTaskSchedule = intervalSchedule(
		this.insightsConfig.pruneCheckIntervalHours * Time.hours.toSeconds,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	readonly retryDelaySeconds = 1;

	constructor(
		private readonly insightsConfig: InsightsConfig,
		private readonly pruningService: InsightsPruningService,
	) {}

	async run(): Promise<void> {
		await this.pruningService.pruneInsights();
	}
}
