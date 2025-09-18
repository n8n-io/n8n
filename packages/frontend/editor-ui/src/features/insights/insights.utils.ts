import { useI18n } from '@n8n/i18n';
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

const getPreviousValue = (value: number, deviation: number): number => value - deviation;

const getDeviation = (value: number, deviation: number): number | null => {
	if (value === 0 && deviation === 0) return 0;

	const previousValue = getPreviousValue(value, deviation);
	if (previousValue === 0) return null; // avoid division by zero

	return (deviation / previousValue) * 100;
};

export const transformInsightsDeviation: Record<
	InsightsSummaryType,
	(value: number, deviation: number) => number | null
> = {
	total: getDeviation,
	failed: getDeviation,
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

export const getTimeRangeLabels = () => {
	const i18n = useI18n();

	return {
		day: i18n.baseText('insights.lastNHours', { interpolate: { count: 24 } }),
		week: i18n.baseText('insights.lastNDays', { interpolate: { count: 7 } }),
		'2weeks': i18n.baseText('insights.lastNDays', { interpolate: { count: 14 } }),
		month: i18n.baseText('insights.lastNDays', { interpolate: { count: 30 } }),
		quarter: i18n.baseText('insights.lastNDays', { interpolate: { count: 90 } }),
		'6months': i18n.baseText('insights.months', { interpolate: { count: 6 } }),
		year: i18n.baseText('insights.oneYear'),
	};
};
