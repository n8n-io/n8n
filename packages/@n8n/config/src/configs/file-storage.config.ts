import { Time } from '@n8n/constants';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { Config, Env } from '../decorators';

const fileStorageModeSchema = z.enum(['fs', 's3', 'az', 'db']);

export type FileStorageMode = z.infer<typeof fileStorageModeSchema>;

@Config
export class FileStorageConfig {
	/**
	 * Where project file bytes are stored. Deliberately its own env (not the
	 * execution-data storage mode, which defaults to `database`): copying that
	 * default would put up to the full quota of blobs into a stock install's
	 * SQLite app DB. `db` stays an explicit opt-in for zero-shared-storage
	 * deployments; `s3`/`az` require an enterprise license.
	 */
	@Env('N8N_FILE_STORAGE_MODE', fileStorageModeSchema)
	mode: FileStorageMode = 'fs';

	/** Maximum total size in bytes allowed for project files, instance-wide. Default: 1 GiB. */
	@Env('N8N_FILE_STORAGE_MAX_SIZE_BYTES')
	maxSize: number = 1024 * 1024 * 1024;

	/** Maximum size in bytes for a single project file. Default: 50 MiB. */
	@Env('N8N_FILE_STORAGE_MAX_FILE_SIZE_BYTES')
	maxFileSize: number = 50 * 1024 * 1024;

	/**
	 * Size in bytes at which to warn that file storage is nearing capacity.
	 * If unset, defaults to 80% of maxSize.
	 */
	@Env('N8N_FILE_STORAGE_WARNING_THRESHOLD_BYTES')
	warningThreshold?: number;

	/**
	 * Duration in milliseconds to cache file storage size checks.
	 * Reduces database load when validating size repeatedly.
	 */
	@Env('N8N_FILE_STORAGE_SIZE_CHECK_CACHE_DURATION_MS')
	sizeCheckCacheDuration: number = 5 * Time.seconds.toMilliseconds;

	/** Interval in milliseconds between cleanup runs for orphaned upload temp files. Default: 1 minute. */
	@Env('N8N_FILE_STORAGE_CLEANUP_INTERVAL_MS')
	cleanupIntervalMs: number = 1 * Time.minutes.toMilliseconds;

	/**
	 * Age in milliseconds after which an uploaded temp file is treated as orphaned and deleted during cleanup.
	 * Default: 2 minutes.
	 */
	@Env('N8N_FILE_STORAGE_FILE_MAX_AGE_MS')
	fileMaxAgeMs: number = 2 * Time.minutes.toMilliseconds;

	/**
	 * Interval in milliseconds between orphaned-key reconciliation sweeps of the byte store.
	 * Runs on the leader main instance only. Default: 7 days.
	 */
	@Env('N8N_FILE_STORAGE_ORPHAN_SWEEP_INTERVAL_MS')
	orphanSweepIntervalMs: number = 7 * Time.days.toMilliseconds;

	/** Time-to-live in milliseconds for signed project-file download URLs. Default: 15 minutes. */
	@Env('N8N_FILE_STORAGE_SIGNED_URL_TTL_MS')
	signedUrlTtlMs: number = 15 * Time.minutes.toMilliseconds;

	/**
	 * Directory for temporary multipart uploads before they are streamed to the byte store.
	 * Files in this directory are pruned by cleanup (see fileMaxAgeMs).
	 * Resolved as `<system-tmp-dir>/n8nFileUploads` (for example, `/tmp/n8nFileUploads`).
	 */
	readonly uploadDir: string;

	constructor() {
		this.uploadDir = path.join(tmpdir(), 'n8nFileUploads');
	}
}
