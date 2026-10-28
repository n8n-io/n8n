import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@n8n/errors';

import type { PackageReader } from '@/modules/n8n-packages/io/package-reader';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

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

	async readManifest(): Promise<PackageManifest> {
		const raw = this.files.get(MANIFEST_FILE);
		if (!raw) throw new BadRequestError('Package is missing manifest.json');
		try {
			return jsonParse<PackageManifest>(raw.toString('utf-8'));
		} catch {
			throw new BadRequestError('Package manifest is not valid JSON');
		}
	}
}
