import { LicenseState, Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { strict } from 'assert';

import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsConfig } from './insights.config';

@Service()
export class InsightsPruningService {
	private pruneInsightsTimeout: NodeJS.Timeout | undefined;

	private isStopped = true;

	private readonly delayOnError = Time.seconds.toMilliseconds;

	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly config: InsightsConfig,
		private readonly licenseState: LicenseState,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	get isPruningEnabled() {
		return this.licenseState.getInsightsRetentionMaxAge() > -1 || this.config.maxAgeDays > -1;
	}

	get pruningMaxAgeInDays() {
		const toMaxSafeIfUnlimited = (days: number) => (days === -1 ? Number.MAX_SAFE_INTEGER : days);

		const licenseMaxAge = toMaxSafeIfUnlimited(this.licenseState.getInsightsRetentionMaxAge());
		const configMaxAge = toMaxSafeIfUnlimited(this.config.maxAgeDays);

		return Math.min(licenseMaxAge, configMaxAge);
	}

	startPruningTimer() {
		strict(this.isStopped);
		this.clearPruningTimer();
		this.isStopped = false;
		this.scheduleNextPrune();
		this.logger.debug('Started pruning timer');
	}

	private clearPruningTimer() {
		if (this.pruneInsightsTimeout !== undefined) {
			clearTimeout(this.pruneInsightsTimeout);
			this.pruneInsightsTimeout = undefined;
		}
	}

	stopPruningTimer() {
		this.isStopped = true;
		this.clearPruningTimer();
		this.logger.debug('Stopped pruning timer');
	}

	private scheduleNextPrune(
		delayMs = this.config.pruneCheckIntervalHours * Time.hours.toMilliseconds,
	) {
		if (this.isStopped) return;

		this.pruneInsightsTimeout = setTimeout(async () => {
			await this.pruneInsights();
		}, delayMs);
	}

	async pruneInsights() {
		this.logger.info('Pruning old insights data');
		try {
			const result = await this.insightsByPeriodRepository.pruneOldData(this.pruningMaxAgeInDays);
			this.logger.debug(
				'Deleted insights by period',
				result.affected ? { count: result.affected } : {},
			);
			this.scheduleNextPrune();
		} catch (error: unknown) {
			this.logger.warn('Pruning failed', { error });

			// In case of failure, we retry the operation after a shorter time
			this.scheduleNextPrune(this.delayOnError);
		}
	}
}
