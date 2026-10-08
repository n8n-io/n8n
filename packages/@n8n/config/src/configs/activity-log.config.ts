import { Config, Env } from '../decorators';
import { nonnegativeIntSchema } from '../schemas';

@Config
export class ActivityLogConfig {
	/** Days to keep activity entries. Zero disables age-based pruning. */
	@Env('N8N_ACTIVITY_LOG_RETENTION_DAYS', nonnegativeIntSchema)
	retentionDays: number = 0;

	/** Maximum entries for the whole instance. Zero disables count-based pruning. */
	@Env('N8N_ACTIVITY_LOG_MAX_ENTRIES', nonnegativeIntSchema)
	maxEntries: number = 1_000;
}
