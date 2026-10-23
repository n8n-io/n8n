import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const positiveInteger = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

@Config
export class AppsConfig {
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
