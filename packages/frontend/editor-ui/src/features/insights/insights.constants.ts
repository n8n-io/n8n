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

export const enum INSIGHT_IMPACT_TYPES {
	POSITIVE = 'positive',
	NEGATIVE = 'negative',
}

export const INSIGHTS_UNIT_IMPACT_MAPPING: Record<InsightsSummaryType, INSIGHT_IMPACT_TYPES> = {
	total: INSIGHT_IMPACT_TYPES.POSITIVE,
	failed: INSIGHT_IMPACT_TYPES.NEGATIVE,
	failureRate: INSIGHT_IMPACT_TYPES.NEGATIVE, // Higher failureRate is bad → negative (red)
	timeSaved: INSIGHT_IMPACT_TYPES.POSITIVE, // More time saved is good → positive (green)
	averageRunTime: INSIGHT_IMPACT_TYPES.NEGATIVE, // Higher avgRunTime is bad → negative (red)
} as const;
