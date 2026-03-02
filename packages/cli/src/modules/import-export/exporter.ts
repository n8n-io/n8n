import type { ExportContext } from './import-export.types';
import type { PackageWriter } from './package-writer';

export interface Exporter<TManifestEntry> {
	readonly key: string;
	export(context: ExportContext, writer: PackageWriter): Promise<TManifestEntry[]>;
}
