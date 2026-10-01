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

	/**
	 * Directory for temporary CSV uploads before import. Files in this directory are pruned by cleanup (see fileMaxAgeMs).
	 * Resolved as `<system-tmp-dir>/n8nDataTableUploads` (for example, `/tmp/n8nDataTableUploads`).
	 */
	readonly uploadDir: string;

	constructor() {
		this.uploadDir = path.join(tmpdir(), 'n8nDataTableUploads');
	}
}
