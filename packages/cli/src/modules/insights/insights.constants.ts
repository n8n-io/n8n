export const INSIGHTS_DATE_RANGE_KEYS = [
	'day',
	'week',
	'2weeks',
	'month',
	'quarter',
	'6months',
	'year',
] as const;

export const keyRangeToDays: Record<(typeof INSIGHTS_DATE_RANGE_KEYS)[number], number> = {
	day: 1,
	week: 7,
	'2weeks': 14,
	month: 30,
	quarter: 90,
	'6months': 180,
	year: 365,
};
