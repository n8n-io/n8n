import { Readable } from 'node:stream';
import { Header, Pack, ReadEntry } from 'tar';

import type { PackageWriter } from '../package-writer';

const FIXED_MTIME = new Date(0);
const MANIFEST_PATH = 'manifest.json';

type Entry = { kind: 'file'; path: string; content: Buffer } | { kind: 'directory'; path: string };

function normaliseEntryPath(path: string): string {
	return path.startsWith('./') ? path.slice(2) : path;
}

function fileEntry(path: string, content: Buffer): ReadEntry {
	const entry = new ReadEntry(
		new Header({ path, size: content.length, mtime: FIXED_MTIME, type: 'File' }),
	);
	entry.end(content);
	return entry;
}

function directoryEntry(path: string): ReadEntry {
	const normalised = path.endsWith('/') ? path : `${path}/`;
	const entry = new ReadEntry(
		new Header({ path: normalised, size: 0, mtime: FIXED_MTIME, type: 'Directory' }),
	);
	entry.end();
	return entry;
}

export class TarPackageWriter implements PackageWriter {
	private readonly entries: Entry[] = [];

	private manifest: Buffer | null = null;

	writeFile(path: string, content: string | Buffer): void {
		const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
		const normalised = normaliseEntryPath(path);

		if (normalised === MANIFEST_PATH) {
			this.manifest = buffer;
			return;
		}

		this.entries.push({ kind: 'file', path: normalised, content: buffer });
	}

	writeDirectory(path: string): void {
		this.entries.push({ kind: 'directory', path: normaliseEntryPath(path) });
	}

	finalize(): Readable {
		const pack = new Pack({ gzip: { portable: true }, mtime: FIXED_MTIME });

		if (this.manifest) {
			pack.write(fileEntry(MANIFEST_PATH, this.manifest));
		}

		for (const entry of this.entries) {
			if (entry.kind === 'file') {
				pack.write(fileEntry(entry.path, entry.content));
			} else {
				pack.write(directoryEntry(entry.path));
			}
		}

		pack.end();
		return Readable.from(pack);
	}
}
