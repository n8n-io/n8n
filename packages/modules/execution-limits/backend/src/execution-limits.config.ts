import { Config, Env } from '@n8n/config';
import { z } from 'zod';

export const USAGE_RETENTION_DAYS_DEFAULT = 400;

/** The longest limit period is one month, and its days must stay countable. */
export const USAGE_RETENTION_DAYS_MIN = 31;

const retentionDaysSchema = z.coerce.number().int().min(USAGE_RETENTION_DAYS_MIN);

@Config
export class ExecutionLimitsConfig {
	/**
	 * How long n8n keeps the daily run counts that execution limits use, in days.
	 * n8n deletes older counts once a day. The value must be a whole number of
	 * at least 31. n8n uses the default for any other value.
	 */
	@Env('N8N_EXECUTION_LIMITS_USAGE_RETENTION_DAYS', retentionDaysSchema)
	usageRetentionDays: number = USAGE_RETENTION_DAYS_DEFAULT;
}
