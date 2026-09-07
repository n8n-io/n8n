import { Time } from '@n8n/constants';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Config, Env } from '../decorators';

@Config
export class DataTableConfig {
	/** Maximum total size in bytes allowed for data tables. Default: 200 MiB. */
	@Env('N8N_DATA_TABLES_MAX_SIZE_BYTES')
	maxSize: number = 200 * 1024 * 1024;

	/**
	 * Size in bytes at which to warn that a data table is nearing capacity.
	 * If unset, defaults to 80% of maxSize.
	 */
	@Env('N8N_DATA_TABLES_WARNING_THRESHOLD_BYTES')
	warningThreshold?: number;

	/**
	 * Duration in milliseconds to cache data table size checks.
	 * Reduces database load when validating size repeatedly.
	 */
	@Env('N8N_DATA_TABLES_SIZE_CHECK_CACHE_DURATION_MS')
	sizeCheckCacheDuration: number = 5 * Time.seconds.toMilliseconds;

	/**
	 * Maximum file size in bytes for CSV uploads to data tables.
	 * If unset, the limit is the remaining available storage.
	 */
	@Env('N8N_DATA_TABLES_UPLOAD_MAX_FILE_SIZE_BYTES')
	uploadMaxFileSize?: number;

	/** Interval in milliseconds between cleanup runs for orphaned upload files. Default: 1 minute. */
	@Env('N8N_DATA_TABLES_CLEANUP_INTERVAL_MS')
	cleanupIntervalMs: number = 1 * Time.minutes.toMilliseconds;

	/**
	 * Age in milliseconds after which an uploaded file is treated as orphaned and deleted during cleanup.
	 * Default: 2 minutes.
	 */
	@Env('N8N_DATA_TABLES_FILE_MAX_AGE_MS')
	fileMaxAgeMs: number = 2 * Time.minutes.toMilliseconds;

	/** Enable durable Data Table trigger capture and delivery. */
	@Env('N8N_DATA_TABLE_TRIGGER_ENABLED')
	triggerEnabled: boolean = false;

	/** Maximum number of trigger deliveries processed by one main at a time. */
	@Env('N8N_DATA_TABLE_TRIGGER_CONCURRENCY')
	triggerConcurrency: number = 4;

	/** Database polling interval used when no wake-up is received. */
	@Env('N8N_DATA_TABLE_TRIGGER_POLL_INTERVAL_MS')
	triggerPollIntervalMs: number = Time.seconds.toMilliseconds;

	/** Duration of a delivery claim before another main can reclaim it. */
	@Env('N8N_DATA_TABLE_TRIGGER_LEASE_MS')
	triggerLeaseMs: number = 30 * Time.seconds.toMilliseconds;

	/** Maximum delivery attempts before a delivery becomes failed. */
	@Env('N8N_DATA_TABLE_TRIGGER_MAX_ATTEMPTS')
	triggerMaxAttempts: number = 10;

	@Env('N8N_DATA_TABLE_TRIGGER_COMPLETED_RETENTION_MS')
	triggerCompletedRetentionMs: number = 7 * Time.days.toMilliseconds;

	@Env('N8N_DATA_TABLE_TRIGGER_FAILED_RETENTION_MS')
	triggerFailedRetentionMs: number = 30 * Time.days.toMilliseconds;

	/**
	 * Directory for temporary CSV uploads before import. Files in this directory are pruned by cleanup (see fileMaxAgeMs).
	 * Resolved as `<system-tmp-dir>/n8nDataTableUploads` (for example, `/tmp/n8nDataTableUploads`).
	 */
	readonly uploadDir: string;

	constructor() {
		this.uploadDir = path.join(tmpdir(), 'n8nDataTableUploads');
	}
}
