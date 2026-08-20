import { jsonParse } from 'n8n-workflow';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';
const ALLOWED_PATH_CHARS = /^[a-zA-Z0-9._/-]+$/;

/** The subset of {@link PackageImportConfig} the reader enforces. */
export interface DirectoryReaderLimits {
	maxUncompressedBytes: number;
	maxEntryBytes: number;
	maxEntries: number;
	maxPathLength: number;
}

/**
 * Reads the n8n-packages layout from loose files in a directory (the "unzipped"
 * format written by {@link DirectoryPackageWriter}), the filesystem counterpart
 * to {@link TarPackageReader}. Reads are lazy — the manifest and each file are
 * read on demand rather than loading the whole tree up front.
 *
 * The directory originates from a remote Git repository, so it is untrusted: the
 * same path-safety and size guards as the tar reader apply. Entry paths must stay
 * within `baseDir`, and a single file may not exceed `maxEntryBytes`.
 */
export class DirectoryPackageReader implements PackageReader {
	constructor(
		private readonly baseDir: string,
		private readonly limits: DirectoryReaderLimits,
	) {}

	async readManifest(): Promise<PackageManifest> {
		let raw: Buffer;
		try {
			raw = await this.readWithinBase(MANIFEST_PATH);
		} catch {
			throw new BadRequestError('Package is missing manifest.json');
		}
		try {
			return jsonParse<PackageManifest>(raw.toString('utf-8'));
		} catch {
			throw new BadRequestError('Package manifest is not valid JSON');
		}
	}

	async readFile(entryPath: string): Promise<Buffer> {
		try {
			return await this.readWithinBase(entryPath);
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			throw new BadRequestError(`Package does not contain entry: ${entryPath}`);
		}
	}

	async listEntries(): Promise<string[]> {
		const entries: string[] = [];
		let totalBytes = 0;
		await this.walk(this.baseDir, (relativePath, size) => {
			if (entries.length + 1 > this.limits.maxEntries) {
				throw new BadRequestError('Package contains too many entries');
			}
			if (relativePath.length > this.limits.maxPathLength) {
				throw new BadRequestError('Package entry path exceeds the maximum allowed length');
			}
			totalBytes += size;
			if (totalBytes > this.limits.maxUncompressedBytes) {
				throw new BadRequestError('Package exceeds the maximum allowed uncompressed size');
			}
			entries.push(relativePath);
		});
		return entries;
	}

	/** Reads a file after validating its path stays within `baseDir` and its size is within limits. */
	private async readWithinBase(entryPath: string): Promise<Buffer> {
		const safePath = this.validateEntryPath(entryPath);
		const absolutePath = this.resolveWithin(safePath);

		const stats = await stat(absolutePath);
		if (!stats.isFile()) {
			throw new BadRequestError(`Package entry is not a file: ${entryPath}`);
		}
		if (stats.size > this.limits.maxEntryBytes) {
			throw new BadRequestError(
				`Package entry "${safePath}" exceeds the maximum allowed uncompressed size per entry`,
			);
		}
		return await readFile(absolutePath);
	}

	/** Mirrors TarPackageReader path validation: relative, in-bounds, allowed characters only. */
	private validateEntryPath(rawPath: string): string {
		const trimmed = rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

		if (trimmed.length === 0) {
			throw new BadRequestError('Package contains an entry with an empty path');
		}
		if (trimmed.length > this.limits.maxPathLength) {
			throw new BadRequestError('Package entry path exceeds the maximum allowed length');
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

		return normalized;
	}

	/** Resolves a validated entry path against the base dir, refusing anything that escapes it. */
	private resolveWithin(safePath: string): string {
		const destination = path.resolve(this.baseDir, safePath);
		const relative = path.relative(this.baseDir, destination);
		if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
			throw new BadRequestError(
				`Package entry path "${safePath}" attempts to escape the package root`,
			);
		}
		return destination;
	}

	/** Depth-first walk yielding each regular file's posix-relative path and size; symlinks are skipped. */
	private async walk(
		dir: string,
		visit: (relativePath: string, size: number) => void,
	): Promise<void> {
		const dirents = await readdir(dir, { withFileTypes: true });
		for (const dirent of dirents) {
			if (dirent.isSymbolicLink()) continue;
			const absolutePath = path.join(dir, dirent.name);
			if (dirent.isDirectory()) {
				await this.walk(absolutePath, visit);
			} else if (dirent.isFile()) {
				const relativePath = path.relative(this.baseDir, absolutePath).split(path.sep).join('/');
				const { size } = await stat(absolutePath);
				visit(relativePath, size);
			}
		}
	}
}
