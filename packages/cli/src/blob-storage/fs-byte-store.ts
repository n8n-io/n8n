import { assertDir } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { ByteStore, ByteStoreKey } from './types';

@Service()
export class FsByteStore implements ByteStore {
	constructor(
		private readonly config: StorageConfig,
		private readonly reporter: ErrorReporter,
	) {}

	async init() {
		await assertDir(this.config.storagePath);
	}

	async write(key: ByteStoreKey, body: Buffer) {
		const writePath = this.resolvePath(key);
		await assertDir(path.dirname(writePath));
		const tempPath = `${writePath}.tmp.${process.pid}.${randomUUID()}`;

		let success = false;

		try {
			await fs.writeFile(tempPath, body);
			await fs.rename(tempPath, writePath);
			success = true;
			return body.length;
		} finally {
			if (!success) {
				await fs.rm(tempPath, { force: true }).catch((error) => this.reporter.error(error));
			}
		}
	}

	async read(key: ByteStoreKey) {
		const readPath = this.resolvePath(key);
		try {
			return await fs.readFile(readPath);
		} catch (error) {
			if (this.isFileNotFound(error)) return null;
			throw error;
		}
	}

	async delete(keys: ByteStoreKey[]) {
		const deletePaths = keys.map((key) => this.resolvePath(key));
		await Promise.all(deletePaths.map(async (p) => await fs.rm(p, { force: true })));
		const dirs = [...new Set(deletePaths.map((p) => path.dirname(p)))];
		await Promise.all(dirs.map(async (dir) => await this.removeEmptyAncestors(dir)));
	}

	// private methods

	private async removeEmptyAncestors(dir: string) {
		const storagePath = path.resolve(this.config.storagePath);
		let current = dir;
		while (current.startsWith(storagePath) && current !== storagePath) {
			try {
				await fs.rmdir(current);
			} catch {
				return; // non-empty (ENOTEMPTY) or already gone (ENOENT)
			}
			current = path.dirname(current);
		}
	}

	private resolvePath(key: ByteStoreKey) {
		const storagePath = path.resolve(this.config.storagePath);
		const resolvedPath = path.resolve(storagePath, key);
		const relativePath = path.relative(storagePath, resolvedPath);

		if (relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new UnexpectedError(
				'Byte store key must resolve to a location inside the storage path',
			);
		}

		return resolvedPath;
	}

	private isFileNotFound(error: unknown): error is NodeJS.ErrnoException {
		return (
			error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
		);
	}
}
