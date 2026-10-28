import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const positiveInteger = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

@Config
export class AppsConfig {
	/** Maximum duration of one app build attempt, in milliseconds. Increase this limit for apps that need more time to install dependencies or compile. */
	@Env('N8N_APPS_BUILD_TIMEOUT_MS', positiveInteger.max(2 ** 31 - 1))
	buildTimeoutMs: number = 10 * 60 * 1000;

	/** Maximum time an app version can stay queued before n8n marks its build as failed, in milliseconds. */
	@Env('N8N_APPS_BUILD_START_TIMEOUT_MS', positiveInteger)
	buildStartTimeoutMs: number = 60 * 1000;

	/** Maximum command output returned with an app build error, in bytes. */
	@Env('N8N_APPS_MAX_BUILD_LOG_BYTES', positiveInteger)
	maxBuildLogBytes: number = 32 * 1024;

	/** Maximum attempts per build request, including the first attempt. n8n retries temporary provider and storage failures within this limit. */
	@Env('N8N_APPS_MAX_BUILD_ATTEMPTS', positiveInteger)
	maxBuildAttempts: number = 3;

	/** Maximum versions to keep per app. Versions still in use are kept even when they exceed this limit. */
	@Env('N8N_APPS_MAX_VERSIONS_PER_APP', positiveInteger)
	maxVersionsPerApp: number = 20;

	/** Maximum built bundles to keep per app. Bundles still in use are kept even when they exceed this limit. */
	@Env('N8N_APPS_MAX_BUNDLES_PER_APP', positiveInteger)
	maxBundlesPerApp: number = 5;

	/** Maximum app artifact storage for the instance, in bytes. Pending uploads and files awaiting deletion count toward this limit. */
	@Env('N8N_APPS_MAX_STORAGE_BYTES', positiveInteger)
	maxStorageBytes: number = 1024 * 1024 * 1024;

	/** Maximum compressed size of one source snapshot or built bundle, in bytes. */
	@Env('N8N_APPS_MAX_ARTIFACT_SIZE_BYTES', positiveInteger.max(2 ** 31 - 1))
	maxArtifactSizeBytes: number = 20 * 1024 * 1024;

	/** Maximum total uncompressed size of one source snapshot or built bundle, in bytes. */
	@Env('N8N_APPS_MAX_ARTIFACT_UNPACKED_SIZE_BYTES', positiveInteger)
	maxArtifactUnpackedSizeBytes: number = 200 * 1024 * 1024;

	/** Maximum archive entries in one source snapshot or built bundle. Counts both files and directories. */
	@Env('N8N_APPS_MAX_ARTIFACT_ENTRIES', positiveInteger)
	maxArtifactEntries: number = 20_000;
}
