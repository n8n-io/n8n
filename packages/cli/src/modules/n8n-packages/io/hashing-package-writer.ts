import { createHash } from 'node:crypto';

import type { PackageWriter } from './package-writer';

/** The SHA that Git gives the file content, so it compares with `git ls-tree` output. */
export function gitBlobSha(content: string | Buffer): string {
	return createHash('sha1')
		.update(`blob ${Buffer.byteLength(content)}\0`)
		.update(content)
		.digest('hex');
}

export class HashingPackageWriter implements PackageWriter {
	private readonly hashes = new Map<string, string>();

	writeFile(path: string, content: string | Buffer): void {
		const normalised = path.startsWith('./') ? path.slice(2) : path;
		this.hashes.set(normalised, gitBlobSha(content));
	}

	writeDirectory(_path: string): void {
		return;
	}

	finalize(): Array<{ path: string; blobSha: string }> {
		return Array.from(this.hashes, ([path, blobSha]) => ({ path, blobSha }));
	}
}
