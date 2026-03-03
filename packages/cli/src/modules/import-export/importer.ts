import type { ProjectImportContext } from './import-export.types';

export interface Importer<TManifestEntry> {
	importForProject(ctx: ProjectImportContext, entries: TManifestEntry[]): Promise<void>;
}
