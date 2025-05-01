import type { InsightsSummary, InsightsSummaryType } from '@n8n/api-types';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
import {
	INSIGHTS_SUMMARY_ORDER,
	INSIGHTS_UNIT_MAPPING,
	INSIGHTS_DEVIATION_UNIT_MAPPING,
} from '@/features/insights/insights.constants';

export const transformInsightsTimeSaved = (minutes: number): number =>
	Math.round(minutes / (Math.abs(minutes) < 60 ? 1 : 60)); // we want to show saved time in minutes or hours
export const transformInsightsAverageRunTime = (ms: number): number => ms / 1000; // we want to show average run time in seconds
export const transformInsightsFailureRate = (value: number): number => value * 100; // we want to show failure rate in percentage

export const transformInsightsValues: Record<InsightsSummaryType, (value: number) => number> = {
	total: (value: number) => value,
	failed: (value: number) => value,
	timeSaved: transformInsightsTimeSaved,
	averageRunTime: transformInsightsAverageRunTime,
	failureRate: transformInsightsFailureRate,
};

export const transformInsightsDeviation: Record<
	InsightsSummaryType,
	(value: number, deviation: number) => number
> = {
	total: (value: number, deviation: number) => (deviation / value) * 100,
	failed: (value: number, deviation: number) => (deviation / value) * 100,
	timeSaved: (_: number, deviation: number) => transformInsightsTimeSaved(deviation),
	averageRunTime: (_: number, deviation: number) => transformInsightsAverageRunTime(deviation),
	failureRate: (_: number, deviation: number) => transformInsightsFailureRate(deviation),
};

export const transformInsightsSummary = (data: InsightsSummary | null): InsightsSummaryDisplay =>
	data
		? INSIGHTS_SUMMARY_ORDER.map((key) => ({
				id: key,
				value: transformInsightsValues[key](data[key].value),
				deviation:
					data[key].deviation === null
						? null
						: transformInsightsDeviation[key](data[key].value, data[key].deviation),
				deviationUnit:
					data[key].deviation === null
						? ''
						: INSIGHTS_DEVIATION_UNIT_MAPPING[key](data[key].deviation),
				unit: INSIGHTS_UNIT_MAPPING[key](data[key].value),
			}))
		: [];
