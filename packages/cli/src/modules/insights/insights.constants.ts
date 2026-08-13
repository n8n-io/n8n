/** Default for `N8N_INSIGHTS_MAX_AGE_DAYS`; also used when the configured value is invalid or not a finite number ≥ 1. */
export const INSIGHTS_MAX_AGE_DAYS_DEFAULT = 365;

/** Maximum allowed value for `N8N_INSIGHTS_MAX_AGE_DAYS` when pruning (2 years). */
export const INSIGHTS_MAX_AGE_DAYS_CAP = 730;

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
