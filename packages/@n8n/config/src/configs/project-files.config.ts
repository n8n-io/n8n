import { Time } from '@n8n/constants';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { Config, Env } from '../decorators';

/**
 * `project_file.fileSizeBytes` is an `int` column, so a single file can never
 * exceed 2^31-1 bytes. Project and instance-wide budgets are unbounded here
 * because they are only ever read as SQL aggregates, which widen past 2^31
 * (Postgres promotes `SUM(int)` to `bigint`; SQLite integers are 64-bit).
 */
const maxFileSizeSchema = z.coerce
	.number()
	.int()
	.positive()
	.max(2 ** 31 - 1, 'Project file max file size cannot exceed 2 GiB');

@Config
export class ProjectFilesConfig {
	/** Maximum size in bytes for a single project file. Default: 100 MiB. */
	@Env('N8N_PROJECT_FILES_MAX_FILE_SIZE_BYTES', maxFileSizeSchema)
	maxFileSize: number = 100 * 1024 * 1024;

	/** Maximum total size in bytes of files in a single team project. Default: 2 GiB. */
	@Env('N8N_PROJECT_FILES_PROJECT_MAX_SIZE_BYTES')
	projectMaxSize: number = 2 * 1024 * 1024 * 1024;

	/**
	 * Maximum total size in bytes of files across *all* personal projects on the
	 * instance combined. Personal projects share one budget rather than getting
	 * one each, so per-user storage does not scale with the user count.
	 * Default: 1 GiB.
	 */
	@Env('N8N_PROJECT_FILES_PERSONAL_TOTAL_MAX_SIZE_BYTES')
	personalTotalMaxSize: number = 1024 * 1024 * 1024;

	/**
	 * Largest file the preview endpoint will serve inline. One value rather than a
	 * per-type pair: 10 MiB covers essentially every photo and text file worth
	 * previewing, and the frontend truncates long text on top of this.
	 * Default: 10 MiB.
	 */
	@Env('N8N_PROJECT_FILES_MAX_PREVIEW_SIZE_BYTES')
	maxPreviewSize: number = 10 * 1024 * 1024;

	/** Interval in milliseconds between sweeps of the temporary upload directory. Default: 1 minute. */
	@Env('N8N_PROJECT_FILES_CLEANUP_INTERVAL_MS')
	cleanupIntervalMs: number = 1 * Time.minutes.toMilliseconds;

	/**
	 * Age in milliseconds after which a staged upload is treated as abandoned and
	 * deleted. Uploads are normally removed as soon as the request finishes; this
	 * only catches files left behind by a crash mid-request.
	 * Default: 10 minutes.
	 */
	@Env('N8N_PROJECT_FILES_FILE_MAX_AGE_MS')
	fileMaxAgeMs: number = 10 * Time.minutes.toMilliseconds;

	/**
	 * Directory for staging multipart uploads before they are handed to
	 * `BinaryDataService`. Resolved as `<system-tmp-dir>/n8nProjectFileUploads`.
	 */
	readonly uploadDir: string;

	constructor() {
		this.uploadDir = path.join(tmpdir(), 'n8nProjectFileUploads');
	}
}
