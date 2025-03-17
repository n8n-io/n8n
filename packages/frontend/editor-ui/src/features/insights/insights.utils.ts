import type { InsightsSummary, InsightsSummaryType } from '@n8n/api-types';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import {
	INSIGHTS_SUMMARY_ORDER,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/insights/insights.constants';

const transformInsightsValue = (key: InsightsSummaryType, value: number): number =>
	key === 'timeSaved'
		? value / 3600 // we want to show saved time in hours
		: key === 'averageRunTime' // in milliseconds
			? Math.round((value / 1000) * 100) / 100 // we want to show average run time in seconds with 2 decimal places
			: value;

export const transformInsightsSummary = (data: InsightsSummary | null): InsightsSummaryDisplay =>
	data
		? INSIGHTS_SUMMARY_ORDER.map((key) => ({
				id: key,
				value: transformInsightsValue(key, data[key].value),
				deviation: transformInsightsValue(key, data[key].deviation),
				unit: INSIGHTS_UNIT_MAPPING[key],
			}))
		: [];
