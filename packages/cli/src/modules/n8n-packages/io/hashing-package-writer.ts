import { createHash } from 'node:crypto';

import type { PackageWriter } from './package-writer';

export class HashingPackageWriter implements PackageWriter {
	private readonly hashes = new Map<string, string>();

	writeFile(path: string, content: string | Buffer): void {
		const normalised = path.startsWith('./') ? path.slice(2) : path;
		const blobSha = createHash('sha1')
			.update(`blob ${Buffer.byteLength(content)}\0`)
			.update(content)
			.digest('hex');
		this.hashes.set(normalised, blobSha);
	}

	writeDirectory(_path: string): void {
		return;
	}

	finalize(): Array<{ path: string; blobSha: string }> {
		return Array.from(this.hashes, ([path, blobSha]) => ({ path, blobSha }));
	}
}
