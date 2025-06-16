import { type InsightsDateRange } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';

export const INSIGHTS_DATE_RANGE_KEYS = [
	'day',
	'week',
	'2weeks',
	'month',
	'quarter',
	'6months',
	'year',
] as const;

export const keyRangeToDays: Record<(typeof INSIGHTS_DATE_RANGE_KEYS)[number], number> = {
	day: 1,
	week: 7,
	'2weeks': 14,
	month: 30,
	quarter: 90,
	'6months': 180,
	year: 365,
};

// TODO: Remove
/**
 * Returns the available date ranges with their license authorization and time granularity
 * when grouped by time.
 */
export function getAvailableDateRanges(licenseState: LicenseState): InsightsDateRange[] {
	const maxHistoryInDays =
		licenseState.getInsightsMaxHistory() === -1
			? Number.MAX_SAFE_INTEGER
			: licenseState.getInsightsMaxHistory();
	const isHourlyDateLicensed = licenseState.isInsightsHourlyDataLicensed();

	return INSIGHTS_DATE_RANGE_KEYS.map((key) => ({
		key,
		licensed:
			key === 'day' ? (isHourlyDateLicensed ?? false) : maxHistoryInDays >= keyRangeToDays[key],
		granularity: key === 'day' ? 'hour' : keyRangeToDays[key] <= 30 ? 'day' : 'week',
	}));
}
