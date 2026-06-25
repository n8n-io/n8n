import { assertDir } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { BlobStore, BlobStoreKey } from './types';

@Service()
export class FsBlobStore implements BlobStore {
	constructor(
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		await assertDir(this.storageConfig.storagePath);
	}

	async write(key: BlobStoreKey, body: Buffer): Promise<number> {
		const writePath = this.resolvePath(key);
		await assertDir(path.dirname(writePath));

		const tempPath = `${writePath}.tmp.${Date.now()}`;
		let success = false;

		try {
			await fs.writeFile(tempPath, body);
			await fs.rename(tempPath, writePath);
			success = true;
			return body.length;
		} finally {
			if (!success)
				await fs.rm(tempPath, { force: true }).catch((error) => this.errorReporter.error(error));
		}
	}

	async read(key: BlobStoreKey): Promise<Buffer | null> {
		try {
			return await fs.readFile(this.resolvePath(key));
		} catch (error) {
			if (this.isFileNotFound(error)) return null;
			throw error;
		}
	}

	async delete(key: BlobStoreKey | BlobStoreKey[]): Promise<void> {
		const keys = Array.isArray(key) ? key : [key];
		await Promise.all(keys.map(async (k) => await fs.rm(this.resolvePath(k), { force: true })));
	}

	private resolvePath(key: BlobStoreKey) {
		const storagePath = path.resolve(this.storageConfig.storagePath);
		const resolvedPath = path.resolve(storagePath, key);
		const relativePath = path.relative(storagePath, resolvedPath);

		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new UnexpectedError('Blob store key resolves outside the storage path');
		}

		return resolvedPath;
	}

	private isFileNotFound(error: unknown): error is NodeJS.ErrnoException {
		return (
			error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
		);
	}
}
