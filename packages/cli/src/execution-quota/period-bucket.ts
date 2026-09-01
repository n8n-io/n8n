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
