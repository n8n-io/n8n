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

	/**
	 * Days of activity to keep. Off by default: the entry cap below already bounds the table, and
	 * an age cap on top only decides how long a quiet instance keeps entries it has room for.
	 * Set it where entries naming deleted resources should expire on a clock rather than on volume.
	 * `0` disables it.
	 */
	@Env('N8N_ACTIVITY_LOG_RETENTION_DAYS', nonnegativeIntSchema)
	retentionDays: number = 0;

	/**
	 * Hard ceiling on stored entries, instance-wide rather than per project — so a busy project
	 * can crowd a quiet one out of the window, which is the reason to raise this rather than disk:
	 * the whole table is well under a megabyte at this size on either driver. Which cap binds
	 * depends on the instance: the age cap above on a quiet one, this on a busy one. `0` means no cap.
	 */
	@Env('N8N_ACTIVITY_LOG_MAX_ENTRIES', nonnegativeIntSchema)
	maxEntries: number = 1_000;
}
