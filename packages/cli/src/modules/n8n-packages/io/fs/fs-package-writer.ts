import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import type { PackageWriter } from '../package-writer';

/**
 * Materializes a package export directly into a directory tree instead of a tar
 * archive — used by the multi-repo source control sync (LIGO-923 POC) to write
 * into a connection's git working directory.
 */
export class FsPackageWriter implements PackageWriter {
	constructor(private readonly rootDir: string) {}

	writeFile(entryPath: string, content: string | Buffer): void {
		const absolute = path.join(this.rootDir, entryPath);
		mkdirSync(path.dirname(absolute), { recursive: true });
		writeFileSync(absolute, content);
	}

	writeDirectory(entryPath: string): void {
		mkdirSync(path.join(this.rootDir, entryPath), { recursive: true });
	}

	finalize(): Readable {
		// Files are already on disk; the stream contract is satisfied with an empty one.
		return Readable.from([]);
	}
}
