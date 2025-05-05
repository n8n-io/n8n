import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';

import { Time } from '@/constants';

import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsConfig } from './insights.config';

@Service()
export class InsightsPruningService {
	private pruneInsightsTimer: NodeJS.Timeout | undefined;

	private isStopped = false;

	private readonly delayBetweenRetries = Time.seconds.toMilliseconds * 10;

	private readonly maxRetries = 3;

	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly config: InsightsConfig,
		private readonly logger: Logger,
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

		this.clearPruningTimer();
		this.isStopped = false;
		this.scheduleNextPrune();
		this.logger.debug(`Insights pruning every ${this.config.pruneCheckIntervalHours} hours`);
	}

	private clearPruningTimer() {
		if (this.pruneInsightsTimer !== undefined) {
			clearTimeout(this.pruneInsightsTimer);
			this.pruneInsightsTimer = undefined;
		}
	}

	stopPruningTimer() {
		this.isStopped = true;
		this.clearPruningTimer();
		this.logger.debug('Stopped Insights pruning');
	}

	private scheduleNextPrune() {
		if (this.isStopped) return;

		this.pruneInsightsTimer = setTimeout(async () => {
			await this.pruneInsights();
			this.scheduleNextPrune(); // reschedule after execution
		}, this.config.pruneCheckIntervalHours * Time.hours.toMilliseconds);
	}

	async pruneInsights() {
		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				const result = await this.insightsByPeriodRepository.pruneOldData(this.config.maxAgeDays);
				this.logger.debug(
					'Deleted insights by period',
					result.affected ? { count: result.affected } : {},
				);
				return;
			} catch (error: unknown) {
				this.logger.warn(`Prune attempt ${attempt} failed`, { error });

				if (attempt === this.maxRetries) {
					this.logger.error('All pruning attempts failed', { error });
				} else {
					await this.delay(this.delayBetweenRetries);
				}
			}
		}
	}

	private async delay(ms: number) {
		return await new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
}
