import type { InsightsSummaryType } from '@n8n/api-types';
import { useI18n } from '@/composables/useI18n';

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

export const DATE_FORMAT_MASK = 'mmm d';

export const GRANULARITY_DATE_FORMAT_MASK = {
	hour: 'HH:mm',
	day: 'mmm d',
	week: 'MMM d-d',
};

export const TIME_RANGE_LABELS = {
	day: useI18n().baseText('insights.lastNHours', { interpolate: { count: 24 } }),
	week: useI18n().baseText('insights.lastNDays', { interpolate: { count: 7 } }),
	'2weeks': useI18n().baseText('insights.lastNDays', { interpolate: { count: 14 } }),
	month: useI18n().baseText('insights.lastNDays', { interpolate: { count: 30 } }),
	quarter: useI18n().baseText('insights.lastNDays', { interpolate: { count: 90 } }),
	'6months': '6 months',
	year: useI18n().baseText('insights.oneYear', { interpolate: { count: 90 } }),
};
