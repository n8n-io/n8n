import type { PackageManifest } from '../spec/manifest.schema.js';

export interface PackageReader {
	readManifest(): Promise<PackageManifest>;
	readFile(path: string): Promise<Buffer>;
	listEntries(): Promise<string[]>;
}
