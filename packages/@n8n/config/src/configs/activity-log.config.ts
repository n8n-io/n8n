import { Config, Env } from '../decorators';
import { nonnegativeIntSchema } from '../schemas';

@Config
export class ActivityLogConfig {
	/**
	 * Whether n8n records recent changes to workflows and credentials in the
	 * activity log. Set to false to stop recording. n8n Assistant and MCP clients
	 * then can't read recent activity. Existing entries stay until pruning
	 * removes them.
	 */
	@Env('N8N_ACTIVITY_LOG_ENABLED')
	enabled: boolean = true;

	/** Days to keep activity entries. Zero disables age-based pruning. */
	@Env('N8N_ACTIVITY_LOG_RETENTION_DAYS', nonnegativeIntSchema)
	retentionDays: number = 0;

	/** Maximum entries for the whole instance. Zero disables count-based pruning. */
	@Env('N8N_ACTIVITY_LOG_MAX_ENTRIES', nonnegativeIntSchema)
	maxEntries: number = 1_000;
}
