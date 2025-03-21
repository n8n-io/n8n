import type { InsightsSummary, InsightsSummaryType } from '@n8n/api-types';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import {
	INSIGHTS_SUMMARY_ORDER,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/insights/insights.constants';

const transformInsightsValues: Partial<Record<InsightsSummaryType, (value: number) => number>> = {
	timeSaved: (value: number): number => value / 3600, // we want to show saved time in hours
	averageRunTime: (value: number): number => Math.round((value / 1000) * 100) / 100, // we want to show average run time in seconds with 2 decimal places
	failureRate: (value: number): number => value * 100, // we want to show failure rate in percentage
};

export const transformInsightsSummary = (data: InsightsSummary | null): InsightsSummaryDisplay =>
	data
		? INSIGHTS_SUMMARY_ORDER.map((key) => ({
				id: key,
				value: transformInsightsValues[key]?.(data[key].value) ?? data[key].value,
				deviation: transformInsightsValues[key]?.(data[key].deviation) ?? data[key].deviation,
				unit: INSIGHTS_UNIT_MAPPING[key],
			}))
		: [];
