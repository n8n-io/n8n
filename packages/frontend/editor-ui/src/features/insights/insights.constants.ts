import type { InsightsSummaryType } from '@n8n/api-types';

export const INSIGHTS_SUMMARY_ORDER: InsightsSummaryType[] = [
	'total',
	'failed',
	'failureRate',
	'timeSaved',
	'averageRunTime',
];

export const INSIGHTS_UNIT_MAPPING: Record<InsightsSummaryType, string> = {
	total: '',
	failed: '',
	failureRate: '%',
	timeSaved: 'h',
	averageRunTime: 's',
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
