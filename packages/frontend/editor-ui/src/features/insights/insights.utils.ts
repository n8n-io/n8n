import type { InsightsSummary, InsightsSummaryType } from '@n8n/api-types';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import {
	INSIGHTS_SUMMARY_ORDER,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/insights/insights.constants';

export const transformInsightsTimeSaved = (value: number): number => value / 3600; // we want to show saved time in hours
export const transformInsightsAverageRunTime = (value: number): number => value / 1000; // we want to show average run time in seconds
export const transformInsightsFailureRate = (value: number): number => value * 100; // we want to show failure rate in percentage

export const transformInsightsValues: Partial<
	Record<InsightsSummaryType, (value: number) => number>
> = {
	timeSaved: transformInsightsTimeSaved,
	averageRunTime: transformInsightsAverageRunTime,
	failureRate: transformInsightsFailureRate,
};

export const transformInsightsSummary = (data: InsightsSummary | null): InsightsSummaryDisplay =>
	data
		? INSIGHTS_SUMMARY_ORDER.map((key) => ({
				id: key,
				value: transformInsightsValues[key]?.(data[key].value) ?? data[key].value,
				deviation: data[key].deviation
					? (transformInsightsValues[key]?.(data[key].deviation) ?? data[key].deviation)
					: null,
				unit: INSIGHTS_UNIT_MAPPING[key],
			}))
		: [];
