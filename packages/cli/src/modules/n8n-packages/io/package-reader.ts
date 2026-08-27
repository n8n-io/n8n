import type { PackageManifest } from '../spec/manifest.schema';

export interface PackageReader {
	readManifest(): Promise<PackageManifest>;
	readFile(path: string): Promise<Buffer>;
	releaseFile?(path: string): void;
	releaseAllFiles?(): void;
	listEntries(): Promise<string[]>;
}
