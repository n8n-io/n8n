import type { InsightsSummaryType } from '@n8n/api-types';
import { useI18n } from '@/composables/useI18n';
import dateformat from 'dateformat';

export const INSIGHTS_SUMMARY_ORDER: InsightsSummaryType[] = [
	'total',
	'failed',
	'failureRate',
	'timeSaved',
	'averageRunTime',
];

export const INSIGHTS_UNIT_MAPPING: Record<InsightsSummaryType, (value: number) => string> = {
	total: () => '',
	failed: () => '',
	failureRate: () => '%',
	timeSaved: (value: number) => (Math.abs(value) < 60 ? 'm' : 'h'),
	averageRunTime: () => 's',
} as const;

export const INSIGHTS_DEVIATION_UNIT_MAPPING: Record<
	InsightsSummaryType,
	(deviation: number) => string
> = {
	total: () => '%',
	failed: () => '%',
	failureRate: () => 'pp',
	timeSaved: (deviation: number) => (Math.abs(deviation) < 60 ? 'm' : 'h'),
	averageRunTime: () => 's',
} as const;

export const INSIGHT_IMPACT_TYPES = {
	POSITIVE: 'positive',
	NEGATIVE: 'negative',
	NEUTRAL: 'neutral',
} as const;

export const INSIGHTS_UNIT_IMPACT_MAPPING: Record<
	InsightsSummaryType,
	(typeof INSIGHT_IMPACT_TYPES)[keyof typeof INSIGHT_IMPACT_TYPES]
> = {
	total: INSIGHT_IMPACT_TYPES.POSITIVE,
	failed: INSIGHT_IMPACT_TYPES.NEGATIVE,
	failureRate: INSIGHT_IMPACT_TYPES.NEGATIVE, // Higher failureRate is bad → negative (red)
	timeSaved: INSIGHT_IMPACT_TYPES.POSITIVE, // More time saved is good → positive (green)
	averageRunTime: INSIGHT_IMPACT_TYPES.NEUTRAL, // Not good or bad → neutral (grey)
} as const;

export const GRANULARITY_DATE_FORMAT_MASK = {
	hour: (date: string) => dateformat(date, 'HH:MM'),
	day: (date: string) => dateformat(date, 'mmm d'),
	week: (date: string) => {
		const startDate = new Date(date);
		const endDate = new Date(startDate);
		endDate.setDate(startDate.getDate() + 7);

		const spansTwoMonths = startDate.getMonth() !== endDate.getMonth();
		const endDateFormat = spansTwoMonths ? 'mmm d' : 'd';

		return [dateformat(startDate, 'mmm d'), dateformat(endDate, endDateFormat)].join('-');
	},
};

export const TELEMETRY_TIME_RANGE = {
	day: 1,
	week: 7,
	'2weeks': 14,
	month: 30,
	quarter: 90,
	'6months': 180,
	year: 365,
};

export const TIME_RANGE_LABELS = {
	day: useI18n().baseText('insights.lastNHours', { interpolate: { count: 24 } }),
	week: useI18n().baseText('insights.lastNDays', { interpolate: { count: 7 } }),
	'2weeks': useI18n().baseText('insights.lastNDays', { interpolate: { count: 14 } }),
	month: useI18n().baseText('insights.lastNDays', { interpolate: { count: 30 } }),
	quarter: useI18n().baseText('insights.lastNDays', { interpolate: { count: 90 } }),
	'6months': useI18n().baseText('insights.months', { interpolate: { count: 6 } }),
	year: useI18n().baseText('insights.oneYear'),
};

export const UNLICENSED_TIME_RANGE = 'UNLICENSED_TIME_RANGE' as const;
