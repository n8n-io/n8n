import { Config, Env } from '@n8n/config';
import { z } from 'zod';

export const USAGE_RETENTION_DAYS_DEFAULT = 400;

/** The longest limit period is one month, and its days must stay countable. */
export const USAGE_RETENTION_DAYS_MIN = 31;

/** About 100 years. A much larger value gives a cutoff that is not a valid date. */
export const USAGE_RETENTION_DAYS_MAX = 36_500;

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
