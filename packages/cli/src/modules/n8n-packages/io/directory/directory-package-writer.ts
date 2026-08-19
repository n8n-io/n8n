import { UnexpectedError } from 'n8n-workflow';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PackageWriter } from '../package-writer';

type Entry = { kind: 'file'; path: string; content: Buffer } | { kind: 'directory'; path: string };

function normaliseEntryPath(entryPath: string): string {
	return entryPath.startsWith('./') ? entryPath.slice(2) : entryPath;
}

/**
 * Writes the n8n-packages layout as loose files into a directory (the "unzipped"
 * format), rather than a tar archive. Entries are buffered during the exporters'
 * synchronous `writeFile`/`writeDirectory` calls — matching `TarPackageWriter` —
 * and flushed to disk in the async {@link finalize}.
 *
 * An optional `subfolder` prefixes every entry, so several packages can live side
 * by side under one `targetDir` (e.g. one project per subfolder) without their
 * `manifest.json` files colliding.
 */
export class DirectoryPackageWriter implements PackageWriter<Promise<void>> {
	private readonly entries: Entry[] = [];

	constructor(
		private readonly targetDir: string,
		private readonly subfolder?: string,
	) {}

	writeFile(entryPath: string, content: string | Buffer): void {
		const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
		this.entries.push({ kind: 'file', path: normaliseEntryPath(entryPath), content: buffer });
	}

	writeDirectory(entryPath: string): void {
		this.entries.push({ kind: 'directory', path: normaliseEntryPath(entryPath) });
	}

	/** Flush every buffered entry to disk under `<targetDir>/<subfolder?>`. */
	async finalize(): Promise<void> {
		const baseDir = this.subfolder ? path.join(this.targetDir, this.subfolder) : this.targetDir;
		await mkdir(baseDir, { recursive: true });

		for (const entry of this.entries) {
			const destination = this.resolveWithin(baseDir, entry.path);
			if (entry.kind === 'directory') {
				await mkdir(destination, { recursive: true });
			} else {
				await mkdir(path.dirname(destination), { recursive: true });
				await writeFile(destination, entry.content);
			}
		}
	}

	/** Entry paths are exporter-generated slugs, but keep writes inside the base dir defensively. */
	private resolveWithin(baseDir: string, entryPath: string): string {
		const destination = path.resolve(baseDir, entryPath);
		const relative = path.relative(baseDir, destination);
		if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
			throw new UnexpectedError(`Refusing to write package entry outside the target: ${entryPath}`);
		}
		return destination;
	}
}
