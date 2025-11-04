import { Config, Env } from '../decorators';

@Config
export class TelemetryConfig {
	/**
	 * Enable telemetry data collection to local database.
	 * When enabled, all telemetry events are stored locally for analysis.
	 */
	@Env('N8N_TELEMETRY_ENABLED')
	enabled: boolean = true;

	/**
	 * Number of days to retain telemetry data.
	 * Older data will be automatically pruned.
	 * Default: 30 days
	 */
	@Env('N8N_TELEMETRY_RETENTION_DAYS')
	retentionDays: number = 30;

	/**
	 * Maximum batch size for frontend telemetry events.
	 * Events are batched before sending to reduce server load.
	 * Default: 100 events
	 */
	@Env('N8N_TELEMETRY_BATCH_SIZE')
	batchSize: number = 100;

	/**
	 * Batch interval in milliseconds.
	 * Events are sent after this delay to allow batching.
	 * Default: 500ms
	 */
	@Env('N8N_TELEMETRY_BATCH_INTERVAL_MS')
	batchIntervalMs: number = 500;
}
