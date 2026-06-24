import { jsonParse } from 'n8n-workflow';
import fs from 'node:fs';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';
const ALLOWED_PATH_CHARS = /^[a-zA-Z0-9._/-]+$/;

/**
 * Reads an exploded package from a directory on disk — the read-side
 * counterpart to {@link FilesystemPackageWriter} and the filesystem analogue of
 * `TarPackageReader`. Used by the instance-pull demo to validate/import a
 * package out of a git working tree.
 *
 * Path validation mirrors `TarPackageReader` so a manifest entry cannot read a
 * file outside `rootDir`.
 */
export class FilesystemPackageReader implements PackageReader {
	constructor(private readonly rootDir: string) {}

	async readManifest(): Promise<PackageManifest> {
		const content = await this.readFile(MANIFEST_PATH).catch(() => {
			throw new BadRequestError('Package is missing manifest.json');
		});
		try {
			return jsonParse<PackageManifest>(content.toString('utf-8'));
		} catch {
			throw new BadRequestError('Package manifest is not valid JSON');
		}
	}

	async readFile(entryPath: string): Promise<Buffer> {
		const absolute = this.resolveSafe(entryPath);
		try {
			return await fs.promises.readFile(absolute);
		} catch (cause) {
			throw new BadRequestError(`Package does not contain entry: ${entryPath}`);
		}
	}

	async listEntries(): Promise<string[]> {
		const entries: string[] = [];
		await this.walk(this.rootDir, '', entries);
		return entries;
	}

	private async walk(absoluteDir: string, relativeDir: string, out: string[]): Promise<void> {
		const dirents = await fs.promises.readdir(absoluteDir, { withFileTypes: true });
		for (const dirent of dirents) {
			const relative = relativeDir ? `${relativeDir}/${dirent.name}` : dirent.name;
			if (dirent.isDirectory()) {
				await this.walk(path.join(absoluteDir, dirent.name), relative, out);
			} else if (dirent.isFile()) {
				out.push(relative);
			}
		}
	}

	/** Validates `entryPath` and resolves it to an absolute path inside `rootDir`. */
	private resolveSafe(rawPath: string): string {
		const trimmed = rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

		if (trimmed.length === 0) {
			throw new BadRequestError('Package contains an entry with an empty path');
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
