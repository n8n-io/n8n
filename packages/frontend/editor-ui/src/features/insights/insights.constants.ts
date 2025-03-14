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
