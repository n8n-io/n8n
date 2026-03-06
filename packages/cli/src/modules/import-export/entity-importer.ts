import type { EntityKey, ImportScope, ManifestEntry } from './import-export.types';

export interface EntityImporter {
	readonly entityKey: EntityKey;
	import(scope: ImportScope, entries: ManifestEntry[]): Promise<void>;
}
