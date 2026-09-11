import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsConfig } from './insights.config';
import { INSIGHTS_MAX_AGE_DAYS_CAP, INSIGHTS_MAX_AGE_DAYS_DEFAULT } from './insights.constants';

@Service()
export class InsightsPruningService {
	constructor(
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly config: InsightsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	get pruningMaxAgeInDays() {
		const configuredMaxAgeDays = this.config.maxAgeDays;
		if (typeof configuredMaxAgeDays !== 'number' || !Number.isFinite(configuredMaxAgeDays)) {
			return INSIGHTS_MAX_AGE_DAYS_DEFAULT;
		}

		if (configuredMaxAgeDays === -1) {
			return INSIGHTS_MAX_AGE_DAYS_CAP;
		}

		if (configuredMaxAgeDays < 1) {
			return INSIGHTS_MAX_AGE_DAYS_DEFAULT;
		}

		return Math.min(configuredMaxAgeDays, INSIGHTS_MAX_AGE_DAYS_CAP);
	}

	/** Deletes insights data past the retention window. A failure propagates to the caller. */
	async pruneInsights() {
		this.logger.info('Pruning old insights data');
		const result = await this.insightsByPeriodRepository.pruneOldData(this.pruningMaxAgeInDays);
		this.logger.debug(
			'Deleted insights by period',
			result.affected ? { count: result.affected } : {},
		);
	}
}
