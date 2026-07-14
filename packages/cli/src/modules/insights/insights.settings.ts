import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { INSIGHTS_DATE_RANGE_KEYS, keyRangeToDays } from './insights.constants';
import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';

@Service()
export class InsightsSettings {
	constructor(
		private readonly licenseState: LicenseState,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
	) {}

	async settings() {
		const earliest = await this.insightsByPeriodRepository.getEarliestDataDate();
		return {
			summary: this.licenseState.isInsightsSummaryLicensed(),
			dashboard: this.licenseState.isInsightsDashboardLicensed(),
			dateRanges: this.getAvailableDateRanges(),
			earliestDataDate: earliest?.toISOString() ?? null,
		};
	}

	private getAvailableDateRanges(): DateRange[] {
		const maxHistoryInDays =
			this.licenseState.getInsightsMaxHistory() === -1
				? Number.MAX_SAFE_INTEGER
				: this.licenseState.getInsightsMaxHistory();
		const isHourlyDateLicensed = this.licenseState.isInsightsHourlyDataLicensed();

		return INSIGHTS_DATE_RANGE_KEYS.map((key) => ({
			key,
			licensed:
				key === 'day' ? (isHourlyDateLicensed ?? false) : maxHistoryInDays >= keyRangeToDays[key],
			granularity: key === 'day' ? 'hour' : keyRangeToDays[key] <= 30 ? 'day' : 'week',
		}));
	}
}

type DateRange = {
	key: 'day' | 'week' | '2weeks' | 'month' | 'quarter' | '6months' | 'year';
	licensed: boolean;
	granularity: 'hour' | 'day' | 'week';
};
