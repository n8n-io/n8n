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
}
