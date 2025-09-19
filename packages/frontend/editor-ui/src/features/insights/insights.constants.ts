import type { InsightsSummaryType } from '@n8n/api-types';
import dateformat from 'dateformat';

export const INSIGHT_TYPES = {
	TOTAL: 'total',
	FAILED: 'failed',
	FAILURE_RATE: 'failureRate',
	TIME_SAVED: 'timeSaved',
	AVERAGE_RUN_TIME: 'averageRunTime',
} as const;

export const INSIGHTS_SUMMARY_ORDER: InsightsSummaryType[] = [
	INSIGHT_TYPES.TOTAL,
	INSIGHT_TYPES.FAILED,
	INSIGHT_TYPES.FAILURE_RATE,
	INSIGHT_TYPES.TIME_SAVED,
	INSIGHT_TYPES.AVERAGE_RUN_TIME,
] as const;

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

export const UNLICENSED_TIME_RANGE = 'UNLICENSED_TIME_RANGE' as const;
