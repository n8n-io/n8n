import type { ExecutionQuotaPeriodUnit } from '@n8n/db';
import type { DateTime } from 'luxon';

/**
 * A canonical, sortable string key for the period bucket a timestamp falls
 * into. Used as an equality key in `project_execution_counter` rather than
 * a timestamp range comparison, so bucket membership is exact and
 * DB-portable.
 */
export function computePeriodBucket(periodUnit: ExecutionQuotaPeriodUnit, date: DateTime): string {
	switch (periodUnit) {
		case 'day':
			return date.toFormat('yyyy-MM-dd');
		case 'week':
			return date.toFormat("kkkk-'W'WW");
		case 'month':
			return date.toFormat('yyyy-MM');
	}
}

/**
 * Symmetric counterpart to {@link computePeriodBucket}: the instant the
 * current period bucket for `date` ends (i.e. the start of the *next*
 * bucket). Used to surface `resetsAt` to callers so they can show a
 * countdown to when the quota next resets.
 *
 * Luxon's `startOf('week')` is ISO-week-based (Monday start), matching the
 * `kkkk-'W'WW` (ISO week/year) bucket key used by `computePeriodBucket`.
 */
export function computePeriodEnd(periodUnit: ExecutionQuotaPeriodUnit, date: DateTime): DateTime {
	switch (periodUnit) {
		case 'day':
			return date.startOf('day').plus({ days: 1 });
		case 'week':
			return date.startOf('week').plus({ weeks: 1 });
		case 'month':
			return date.startOf('month').plus({ months: 1 });
	}
}
