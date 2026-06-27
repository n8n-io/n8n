import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageWriter } from '../package-writer';

const ALLOWED_PATH_CHARS = /^[a-zA-Z0-9._/-]+$/;

function normaliseEntryPath(entryPath: string): string {
	return entryPath.startsWith('./') ? entryPath.slice(2) : entryPath;
}

/**
 * Writes an exploded package directly into a directory on disk:
 * `manifest.json` + `workflows/<slug>/workflow.json` +
 * `credentials/<slug>/credential.json`. The read-side counterpart is
 * {@link FilesystemPackageReader}. Used by the instance-pull demo to write the
 * package into a git working tree instead of a tar stream.
 *
 * Path validation mirrors `TarPackageReader` so a malicious slug cannot escape
 * `rootDir`.
 */
export class FilesystemPackageWriter implements PackageWriter {
	constructor(private readonly rootDir: string) {}

	writeFile(entryPath: string, content: string | Buffer): void {
		const absolute = this.resolveSafe(entryPath);
		fs.mkdirSync(path.dirname(absolute), { recursive: true });
		fs.writeFileSync(absolute, content);
	}

	writeDirectory(entryPath: string): void {
		const absolute = this.resolveSafe(entryPath);
		fs.mkdirSync(absolute, { recursive: true });
	}

	/**
	 * The package is written eagerly to disk, so there is no stream to flush.
	 * Returns an empty stream to satisfy the {@link PackageWriter} contract.
	 */
	finalize(): Readable {
		return Readable.from([]);
	}

	/** Validates `entryPath` and resolves it to an absolute path inside `rootDir`. */
	private resolveSafe(rawPath: string): string {
		const trimmed = normaliseEntryPath(rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath);

		if (trimmed.length === 0) {
			throw new BadRequestError('Package entry has an empty path');
		}
		if (trimmed.startsWith('/')) {
			throw new BadRequestError(`Package entry path "${trimmed}" must be relative`);
		}
		if (!ALLOWED_PATH_CHARS.test(trimmed)) {
			throw new BadRequestError(`Package entry path "${trimmed}" contains disallowed characters`);
		}

		const normalized = path.posix.normalize(trimmed);
		if (
			normalized === '..' ||
			normalized.startsWith('../') ||
			normalized.includes('/../') ||
			normalized.endsWith('/..')
		) {
			throw new BadRequestError(
				`Package entry path "${trimmed}" attempts to escape the package root`,
			);
		}

		return path.resolve(this.rootDir, normalized);
	}
}
