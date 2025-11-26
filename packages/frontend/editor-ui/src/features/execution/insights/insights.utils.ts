import {
	INSIGHTS_DEVIATION_UNIT_MAPPING,
	INSIGHTS_SUMMARY_ORDER,
	INSIGHTS_UNIT_MAPPING,
} from '@/features/execution/insights/insights.constants';
import type { InsightsSummaryDisplay } from '@/features/execution/insights/insights.types';
import type { DateValue } from '@internationalized/date';
import { getLocalTimeZone, isToday } from '@internationalized/date';
import type { InsightsDateRange, InsightsSummary, InsightsSummaryType } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import dateformat from 'dateformat';

const DATE_FORMAT_DAY_MONTH_YEAR = 'd mmm, yyyy';
const DATE_FORMAT_DAY_MONTH = 'd mmm';

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

export const timeRangeMappings: Record<InsightsDateRange['key'], number> = {
	day: 1,
	week: 7,
	'2weeks': 14,
	month: 30,
	quarter: 90,
	'6months': 180,
	year: 365,
} as const;

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

/**
 * @returns A human readable string representing the date range e.g '01 Jan - 05 Jan 2025'
 */
export const formatDateRange = (range: { start?: DateValue; end?: DateValue }): string => {
	const { start, end } = range;
	if (!start) return '';

	const startDate = start.toDate(getLocalTimeZone());
	const endDate = end?.toDate(getLocalTimeZone());

	if (!end || start.compare(end) === 0) {
		return dateformat(startDate, DATE_FORMAT_DAY_MONTH_YEAR);
	}

	if (start.year === end.year) {
		return `${dateformat(startDate, DATE_FORMAT_DAY_MONTH)} - ${dateformat(endDate, DATE_FORMAT_DAY_MONTH_YEAR)}`;
	}

	return `${dateformat(startDate, DATE_FORMAT_DAY_MONTH_YEAR)} - ${dateformat(endDate, DATE_FORMAT_DAY_MONTH_YEAR)}`;
};

/**
 * @returns The matching preset key if the range matches a preset, null for custom ranges
 */
export const getMatchingPreset = (range: { start?: DateValue; end?: DateValue }):
	| InsightsDateRange['key']
	| null => {
	const { start, end } = range;
	if (!start || !end || !isToday(end, getLocalTimeZone())) return null;

	const daysDiff = end.compare(start);

	for (const [key, days] of Object.entries(timeRangeMappings)) {
		if (daysDiff === days) return key as InsightsDateRange['key'];
	}

	return null;
};
