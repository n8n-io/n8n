import { Time } from '@n8n/constants';
import { intervalFromMilliseconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { InsightsCompactionService } from './insights-compaction.service';
import { InsightsConfig } from './insights.config';

/**
 * Rolls raw insight events up into per-period summaries, so the insights
 * dashboards stay fast and the stored data stays small.
 */
@SystemTask()
export class InsightsCompactionTask implements SystemTask {
	readonly name = 'insights-compaction';

	readonly schedule: SystemTaskSchedule = intervalFromMilliseconds(
		this.insightsConfig.compactionIntervalMinutes * Time.minutes.toMilliseconds,
	);

	readonly effects: SystemTaskEffects = 'idempotent';

	readonly placement: SystemTaskPlacement = { scope: 'cluster', durable: true };

	constructor(
		private readonly insightsConfig: InsightsConfig,
		private readonly compactionService: InsightsCompactionService,
	) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.compactionService.compactInsights(signal);
	}
}
