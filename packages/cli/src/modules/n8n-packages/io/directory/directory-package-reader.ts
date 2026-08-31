import { jsonParse } from 'n8n-workflow';
import type { Stats } from 'node:fs';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';
const ALLOWED_PATH_CHARS = /^[a-zA-Z0-9._/-]+$/;

export interface DirectoryReaderLimits {
	maxUncompressedBytes: number;
	maxEntryBytes: number;
	maxEntries: number;
	maxPathLength: number;
}

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
			if (size > this.limits.maxEntryBytes) {
				throw new BadRequestError(
					`Package entry "${relativePath}" exceeds the maximum allowed uncompressed size per entry`,
				);
			}
			totalBytes += size;
			if (totalBytes > this.limits.maxUncompressedBytes) {
				throw new BadRequestError('Package exceeds the maximum allowed uncompressed size');
			}
			entries.push(relativePath);
		});
		return entries;
	}

	private async readWithinBase(entryPath: string): Promise<Buffer> {
		const safePath = this.validateEntryPath(entryPath);
		const absolutePath = this.resolveWithin(safePath);

		const stats = await this.lstatWithoutSymlinks(absolutePath, safePath);
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

	private async lstatWithoutSymlinks(absolutePath: string, entryPath: string): Promise<Stats> {
		let currentPath = this.baseDir;
		let stats = await lstat(currentPath);
		if (stats.isSymbolicLink()) {
			throw new BadRequestError('Package root has a disallowed entry type');
		}

		const relativePath = path.relative(this.baseDir, absolutePath);
		for (const component of relativePath.split(path.sep)) {
			currentPath = path.join(currentPath, component);
			stats = await lstat(currentPath);
			if (stats.isSymbolicLink()) {
				throw new BadRequestError(`Package contains a disallowed entry type for "${entryPath}"`);
			}
		}

		return stats;
	}

	/** Keep path validation aligned with TarPackageReader. */
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

	private async walk(
		dir: string,
		visit: (relativePath: string, size: number) => void,
	): Promise<void> {
		if ((await lstat(dir)).isSymbolicLink()) {
			const relativeDirPath = path.relative(this.baseDir, dir).split(path.sep).join('/') || '.';
			throw new BadRequestError(
				`Package contains a disallowed entry type for "${relativeDirPath}"`,
			);
		}
		const dirents = await readdir(dir, { withFileTypes: true });
		for (const dirent of dirents) {
			const absolutePath = path.join(dir, dirent.name);
			const relativePath = path.relative(this.baseDir, absolutePath).split(path.sep).join('/');
			const stats = await lstat(absolutePath);
			if (stats.isSymbolicLink()) {
				throw new BadRequestError(`Package contains a disallowed entry type for "${relativePath}"`);
			}
			if (stats.isDirectory()) {
				await this.walk(absolutePath, visit);
			} else if (stats.isFile()) {
				visit(relativePath, stats.size);
			}
		}
	}
}
