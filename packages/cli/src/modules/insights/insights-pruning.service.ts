import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';

import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsConfig } from './insights.config';

@Service()
export class InsightsPruningService {
	private pruneInsightsTimer: NodeJS.Timer | undefined;

	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly config: InsightsConfig,
		private readonly logger: Logger, // Assuming a logger is injected,
	) {
		this.logger = this.logger.scoped('insights');
	}

	get isPruningEnabled() {
		return this.config.maxAgeDays > -1;
	}

	startPruningTimer() {
		if (!this.isPruningEnabled) {
			return;
		}

		this.stopPruningTimer();
		this.pruneInsightsTimer = setInterval(
			async () => await this.pruneInsights(),
			this.config.pruneCheckIntervalHours * 60 * 60 * 1000,
		);
		this.logger.debug(`Insights pruning every ${this.config.pruneCheckIntervalHours} hours`);
	}

	stopPruningTimer() {
		if (this.pruneInsightsTimer !== undefined) {
			clearInterval(this.pruneInsightsTimer);
			this.pruneInsightsTimer = undefined;
		}
	}

	async pruneInsights() {
		try {
			const result = await this.insightsByPeriodRepository.pruneOldData(this.config.maxAgeDays);
			this.logger.debug('Hard-deleted insights', { count: result.affected });
		} catch (error: unknown) {
			this.logger.error('Error while pruning insights', { error });
		}
	}
}
