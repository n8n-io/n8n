import type { PackageManifest } from '../spec/manifest.schema';

export interface PackageReader {
	readManifest(): Promise<PackageManifest>;
	readFile(path: string): Promise<Buffer>;
	readOptionalFile(path: string): Promise<Buffer | null>;
	listEntries(): Promise<string[]>;
}
