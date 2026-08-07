import { jsonParse } from 'n8n-workflow';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';

/**
 * Reads a package from a directory tree (a connection's git working directory)
 * instead of a tar archive — counterpart of FsPackageWriter (LIGO-923 POC).
 */
export class FsPackageReader implements PackageReader {
	constructor(private readonly rootDir: string) {}

	async readManifest(): Promise<PackageManifest> {
		const manifest = await this.readFile(MANIFEST_PATH);
		try {
			return jsonParse<PackageManifest>(manifest.toString('utf-8'));
		} catch {
			throw new BadRequestError('Package manifest is not valid JSON');
		}
	}

	async readFile(entryPath: string): Promise<Buffer> {
		try {
			return readFileSync(path.join(this.rootDir, entryPath));
		} catch {
			throw new BadRequestError(`Package does not contain entry: ${entryPath}`);
		}
	}

	async listEntries(): Promise<string[]> {
		const entries: string[] = [];
		const walk = (relativeDir: string) => {
			const absoluteDir = path.join(this.rootDir, relativeDir);
			for (const dirent of readdirSync(absoluteDir, { withFileTypes: true })) {
				if (dirent.name === '.git') continue;
				const relativePath = relativeDir ? `${relativeDir}/${dirent.name}` : dirent.name;
				if (dirent.isDirectory()) walk(relativePath);
				else if (dirent.isFile()) entries.push(relativePath);
			}
		};
		walk('');
		return entries;
	}
}
