import * as tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import type { Readable } from 'node:stream';

import type { PackageWriter } from '../package-writer';

const FIXED_MTIME = new Date(0);
const MANIFEST_PATH = 'manifest.json';

type Entry = { kind: 'file'; path: string; content: Buffer } | { kind: 'directory'; path: string };

/**
 * Writes a gzipped tar package. Entries are buffered in memory so we can
 * emit the manifest as the *first* tar entry on finalize — consumers can
 * stream-read just the header to fail fast (e.g. on version mismatch)
 * without unpacking the full archive.
 *
 * Trade-off: the package is held in memory between `writeFile` and
 * `finalize()`. Acceptable at our current target size (≤100MB).
 */
export class TarPackageWriter implements PackageWriter {
	private readonly entries: Entry[] = [];
	private manifest: Buffer | null = null;

	writeFile(path: string, content: string | Buffer): void {
		const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

		if (path === MANIFEST_PATH) {
			// Hold the manifest aside so it can be emitted first on finalize.
			this.manifest = buffer;
			return;
		}

		this.entries.push({ kind: 'file', path, content: buffer });
	}

	writeDirectory(path: string): void {
		this.entries.push({ kind: 'directory', path });
	}

	finalize(): Readable {
		const pack = tar.pack();

		if (this.manifest) {
			pack.entry({ name: MANIFEST_PATH, mtime: FIXED_MTIME }, this.manifest);
		}

		for (const entry of this.entries) {
			if (entry.kind === 'file') {
				pack.entry({ name: entry.path, mtime: FIXED_MTIME }, entry.content);
			} else {
				pack.entry({
					name: entry.path.endsWith('/') ? entry.path : `${entry.path}/`,
					type: 'directory',
					mtime: FIXED_MTIME,
				});
			}
		}

		pack.finalize();
		return pack.pipe(createGzip());
	}
}
