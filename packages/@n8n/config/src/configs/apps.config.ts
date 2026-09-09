import { Config, Env } from '../decorators';

@Config
export class AppsConfig {
	/** Maximum number of Apps a single project may have. */
	@Env('N8N_APPS_MAX_PER_PROJECT')
	maxAppsPerProject: number = 20;

	/** Maximum number of versions a single App may accumulate. */
	@Env('N8N_APPS_MAX_VERSIONS_PER_APP')
	maxVersionsPerApp: number = 50;

	/** Maximum total bytes (source + dist, across all versions) a project's apps may occupy. */
	@Env('N8N_APPS_MAX_PROJECT_BLOB_SIZE_BYTES')
	maxProjectBlobSize: number = 500 * 1024 * 1024;
}
