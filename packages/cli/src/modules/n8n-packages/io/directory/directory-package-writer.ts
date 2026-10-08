import { UnexpectedError } from 'n8n-workflow';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PackageWriter } from '../package-writer';

function normaliseEntryPath(entryPath: string): string {
	return entryPath.startsWith('./') ? entryPath.slice(2) : entryPath;
}

/**
 * Writes the n8n-packages layout as loose files into a directory (the "unzipped"
 * format), rather than a tar archive.
 */
export class DirectoryPackageWriter implements PackageWriter {
	constructor(private readonly targetDir: string) {}

	async writeFile(entryPath: string, content: string | Buffer): Promise<void> {
		const destination = this.resolveWithin(this.targetDir, normaliseEntryPath(entryPath));
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, content);
	}

	async writeDirectory(entryPath: string): Promise<void> {
		const destination = this.resolveWithin(this.targetDir, normaliseEntryPath(entryPath));
		await mkdir(destination, { recursive: true });
	}

	async finalize(): Promise<void> {
		return;
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
