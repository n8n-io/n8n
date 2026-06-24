import type { PackageManifest } from '../spec/manifest.schema';

export interface PackageReader {
	readManifest(): Promise<PackageManifest>;
	readFile(path: string): Promise<Buffer>;
	listEntries(): Promise<string[]>;
}
