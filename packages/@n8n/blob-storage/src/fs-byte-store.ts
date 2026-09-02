import { assertDir } from '@n8n/backend-common';
import { UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';

import { assertChunkSize } from './stream-utils';
import type { ByteStore, ByteStoreKey } from './types';

export type FsByteStoreOptions = {
	/** Root dir all keys resolve under. */
	storagePath: string;

	/** Reports a non-fatal error, e.g. a failed temp-file cleanup. */
	reportError: (error: unknown) => void;
};

export class FsByteStore implements ByteStore {
	constructor(private readonly options: FsByteStoreOptions) {}

	async init() {
		await assertDir(this.options.storagePath);
	}

	async write(key: ByteStoreKey, body: Buffer | Readable) {
		const writePath = this.getAbsolutePath(key);
		await assertDir(path.dirname(writePath));
		const tempPath = `${writePath}.tmp.${process.pid}.${randomUUID()}`;

		let success = false;

		try {
			await fs.writeFile(tempPath, body);
			const bytesWritten = Buffer.isBuffer(body) ? body.length : (await fs.stat(tempPath)).size;
			await fs.rename(tempPath, writePath);
			success = true;
			return bytesWritten;
		} finally {
			if (!success) {
				await fs.rm(tempPath, { force: true }).catch((error) => this.options.reportError(error));
			}
		}
	}

	async read(key: ByteStoreKey) {
		const readPath = this.getAbsolutePath(key);
		try {
			return await fs.readFile(readPath);
		} catch (error) {
			if (this.isFileNotFound(error)) return null;
			throw error;
		}
	}

	async readStream(key: ByteStoreKey, { chunkSize }: { chunkSize?: number } = {}) {
		if (chunkSize !== undefined) assertChunkSize(chunkSize);
		const readPath = this.getAbsolutePath(key);
		let fileHandle;
		try {
			fileHandle = await fs.open(readPath, 'r');
		} catch (error) {
			if (this.isFileNotFound(error)) return null;
			throw error;
		}
		try {
			return fileHandle.createReadStream(chunkSize ? { highWaterMark: chunkSize } : {});
		} catch (error) {
			await fileHandle.close().catch(() => {});
			throw error;
		}
	}

	async copy(sourceKey: ByteStoreKey, targetKey: ByteStoreKey) {
		const targetPath = this.getAbsolutePath(targetKey);
		await assertDir(path.dirname(targetPath));
		await fs.copyFile(this.getAbsolutePath(sourceKey), targetPath);
	}

	async rename(oldKey: ByteStoreKey, newKey: ByteStoreKey) {
		if (oldKey === newKey) return;
		const newPath = this.getAbsolutePath(newKey);
		await assertDir(path.dirname(newPath));
		await fs.rename(this.getAbsolutePath(oldKey), newPath);
	}

	async deletePrefix(prefix: string) {
		const dir = this.getAbsolutePath(prefix);
		await fs.rm(dir, { recursive: true, force: true });
		await this.removeEmptyAncestors(path.dirname(dir));
	}

	async delete(keys: ByteStoreKey[]) {
		const deletePaths = keys.map((key) => this.getAbsolutePath(key));
		await Promise.all(deletePaths.map(async (p) => await fs.rm(p, { force: true })));
		const dirs = [...new Set(deletePaths.map((p) => path.dirname(p)))];
		await Promise.all(dirs.map(async (dir) => await this.removeEmptyAncestors(dir)));
	}

	/** Absolute filesystem path for `key`, guarded against escaping the storage root. */
	getAbsolutePath(key: ByteStoreKey) {
		const storagePath = path.resolve(this.options.storagePath);
		const resolvedPath = path.resolve(storagePath, key);
		const relativePath = path.relative(storagePath, resolvedPath);

		if (relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new UnexpectedError(
				'Byte store key must resolve to a location inside the storage path',
			);
		}

		return resolvedPath;
	}

	// private methods

	private async removeEmptyAncestors(dir: string) {
		const storagePath = path.resolve(this.options.storagePath);
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

	private isFileNotFound(error: unknown): error is NodeJS.ErrnoException {
		return (
			error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
		);
	}
}
