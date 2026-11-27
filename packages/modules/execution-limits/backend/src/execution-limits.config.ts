import type { ExecutionLimitPeriodUnit } from '@n8n/api-types';
import { Config, Env } from '@n8n/config';
import { z } from 'zod';

/** One year and two months: last year's month stays whole for a month after this one ends. */
const USAGE_RETENTION_DAYS_DEFAULT = 430;

const LONGEST_PERIOD_DAYS = {
	day: 1,
	week: 7,
	month: 31,
} satisfies Record<ExecutionLimitPeriodUnit, number>;

/** The days of the current period must stay countable, for each period unit. */
const USAGE_RETENTION_DAYS_MIN = Math.max(...Object.values(LONGEST_PERIOD_DAYS));

/** About 100 years. A much larger value gives a cutoff that is not a valid date. */
const USAGE_RETENTION_DAYS_MAX = 36_500;

const retentionDaysSchema = z.coerce
	.number()
	.int()
	.min(USAGE_RETENTION_DAYS_MIN)
	.max(USAGE_RETENTION_DAYS_MAX);

@Config
export class ExecutionLimitsConfig {
	/**
	 * How long n8n keeps the daily run counts that execution limits use, in days.
	 * n8n deletes older counts once a day. The value must be a whole number from
	 * 31 to 36500. n8n uses the default for any other value.
	 */
	@Env('N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS', retentionDaysSchema)
	usageRetentionDays: number = USAGE_RETENTION_DAYS_DEFAULT;
}
