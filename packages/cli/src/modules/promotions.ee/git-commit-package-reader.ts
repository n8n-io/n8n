import { BadRequestError } from '@n8n/errors';

import type { PackageReader } from '@/modules/n8n-packages/io/package-reader';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { manifestFromFiles } from './package-manifest';

/**
 * Reads a package from the files of one commit, as `readTreeAtCommit` returns them. Git already
 * checked the paths and the size limits, so the reader only looks files up.
 */
export class GitCommitPackageReader implements PackageReader {
	constructor(private readonly files: ReadonlyMap<string, Buffer>) {}

	async listEntries(): Promise<string[]> {
		return [...this.files.keys()];
	}

	async readFile(entryPath: string): Promise<Buffer> {
		const content = this.files.get(entryPath);
		if (!content) throw new BadRequestError(`Package does not contain entry: ${entryPath}`);
		return content;
	}

	/** The importer asks for the manifest many times, and each build parses every entity file. */
	private manifest?: PackageManifest;

	/** The branch holds no manifest. It is built from the entity files, and a stale one is ignored. */
	async readManifest(): Promise<PackageManifest> {
		const manifest = this.manifest ?? manifestFromFiles(this.files);
		this.manifest = manifest;
		return manifest;
	}
}
