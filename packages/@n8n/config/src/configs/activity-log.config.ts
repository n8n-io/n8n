import { Config, Env } from '../decorators';
import { nonnegativeIntSchema } from '../schemas';

@Config
export class ActivityLogConfig {
	/**
	 * Whether to record instance activity to `activity_event`. Read once when the relay starts, so
	 * a disabled instance registers no listeners and pays nothing per event.
	 */
	@Env('N8N_ACTIVITY_LOG_ENABLED')
	enabled: boolean = false;

	/** Days of activity to keep. Entries older than this are pruned. `0` keeps them until the count cap bites. */
	@Env('N8N_ACTIVITY_LOG_RETENTION_DAYS', nonnegativeIntSchema)
	retentionDays: number = 14;

	/** Ceiling on stored entries, as a backstop for an instance busier than the age cap assumes. `0` means no cap. */
	@Env('N8N_ACTIVITY_LOG_MAX_ENTRIES', nonnegativeIntSchema)
	maxEntries: number = 20_000;
}
