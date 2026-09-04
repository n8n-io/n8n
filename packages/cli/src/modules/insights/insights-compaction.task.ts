import { Time } from '@n8n/constants';
import { SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskSchedule } from '@n8n/decorators';

import { InsightsCompactionService } from './insights-compaction.service';
import { intervalSchedule } from './insights-task-schedule';
import { InsightsConfig } from './insights.config';

/**
 * Rolls raw insight events up into per-period summaries, so the insights
 * dashboards stay fast and the stored data stays small.
 */
@SystemTask()
export class InsightsCompactionTask implements SystemTask {
	readonly name = 'insights-compaction';

	readonly schedule: SystemTaskSchedule = intervalSchedule(
		this.insightsConfig.compactionIntervalMinutes * Time.minutes.toSeconds,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly durable = false;

	constructor(
		private readonly insightsConfig: InsightsConfig,
		private readonly compactionService: InsightsCompactionService,
	) {}

	async run(): Promise<void> {
		await this.compactionService.compactInsights();
	}
}
