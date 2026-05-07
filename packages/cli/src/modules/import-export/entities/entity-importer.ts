import type { ImportScope } from '../import-export.types';
import type { EntityKey, ManifestEntry } from '../spec/manifest.types';

/**
 * Uniform interface for parallel-phase importers that don't depend on
 * outputs of other importers. Sequential-phase importers (Folder) and
 * importers that need typed dependencies (Workflow) have richer signatures
 * and are called directly by the pipeline.
 */
export interface EntityImporter {
	readonly entityKey: EntityKey;
	import(scope: ImportScope, entries: ManifestEntry[]): Promise<void>;
}
