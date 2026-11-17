import type { PackageManifest } from '@n8n/api-types';

export interface PackageReader {
	readManifest(): Promise<PackageManifest>;
	readFile(path: string): Promise<Buffer>;
	listEntries(): Promise<string[]>;
}
