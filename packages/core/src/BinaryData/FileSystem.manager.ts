/**
 * @tech_debt The `workflowId` arguments on write are for compatibility with the
 * `BinaryData.Manager` interface. Unused in filesystem mode until we refactor
 * how we store binary data files in the `/binaryData` dir.
 */

import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { jsonParse } from 'n8n-workflow';
import { rename } from 'node:fs/promises';

import { FileNotFoundError } from '../errors';
import { ensureDirExists } from './utils';

import type { Readable } from 'stream';
import type { BinaryData } from './types';

const EXECUTION_ID_EXTRACTOR =
	/^(\w+)(?:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

export class FileSystemManager implements BinaryData.Manager {
	constructor(private storagePath: string) {}

	async init() {
		await ensureDirExists(this.storagePath);
	}

	getPath(fileId: string) {
		return this.resolvePath(fileId);
	}

	async getAsStream(fileId: string, chunkSize?: number) {
		const filePath = this.getPath(fileId);

		return createReadStream(filePath, { highWaterMark: chunkSize });
	}

	async getAsBuffer(fileId: string) {
		const filePath = this.getPath(fileId);

		try {
			return await fs.readFile(filePath);
		} catch {
			throw new Error(`Error finding file: ${filePath}`);
		}
	}

	async getMetadata(fileId: string): Promise<BinaryData.Metadata> {
		const filePath = this.resolvePath(`${fileId}.metadata`);

		return jsonParse(await fs.readFile(filePath, { encoding: 'utf-8' }));
	}

	async store(
		_workflowId: string,
		executionId: string,
		bufferOrStream: Buffer | Readable,
		{ mimeType, fileName }: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.toFileId(executionId);
		const filePath = this.getPath(fileId);

		await fs.writeFile(filePath, bufferOrStream);

		const fileSize = await this.getSize(fileId);

		await this.storeMetadata(fileId, { mimeType, fileName, fileSize });

		return { fileId, fileSize };
	}

	async deleteOne(fileId: string) {
		const filePath = this.getPath(fileId);

		return fs.rm(filePath);
	}

	async deleteMany(ids: BinaryData.IdsForDeletion) {
		const executionIds = ids.map((o) => o.executionId);

		const set = new Set(executionIds);
		const fileNames = await fs.readdir(this.storagePath);

		for (const fileName of fileNames) {
			const executionId = fileName.match(EXECUTION_ID_EXTRACTOR)?.[1];

			if (executionId && set.has(executionId)) {
				const filePath = this.resolvePath(fileName);

				await Promise.all([fs.rm(filePath), fs.rm(`${filePath}.metadata`)]);
			}
		}
	}

	async copyByFilePath(
		_workflowId: string,
		executionId: string,
		filePath: string,
		{ mimeType, fileName }: BinaryData.PreWriteMetadata,
	) {
		const newFileId = this.toFileId(executionId);

		await fs.cp(filePath, this.getPath(newFileId));

		const fileSize = await this.getSize(newFileId);

		await this.storeMetadata(newFileId, { mimeType, fileName, fileSize });

		return { fileId: newFileId, fileSize };
	}

	async copyByFileId(_workflowId: string, executionId: string, sourceFileId: string) {
		const targetFileId = this.toFileId(executionId);
		const sourcePath = this.resolvePath(sourceFileId);
		const targetPath = this.resolvePath(targetFileId);

		await fs.copyFile(sourcePath, targetPath);

		return targetFileId;
	}

	async rename(oldFileId: string, newFileId: string) {
		const oldPath = this.getPath(oldFileId);
		const newPath = this.getPath(newFileId);

		await Promise.all([
			rename(oldPath, newPath),
			rename(`${oldPath}.metadata`, `${newPath}.metadata`),
		]);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private toFileId(executionId: string) {
		return [executionId, uuid()].join('');
	}

	private resolvePath(...args: string[]) {
		const returnPath = path.join(this.storagePath, ...args);

		if (path.relative(this.storagePath, returnPath).startsWith('..')) {
			throw new FileNotFoundError('Invalid path detected');
		}

		return returnPath;
	}

	private async storeMetadata(fileId: string, metadata: BinaryData.Metadata) {
		const filePath = this.resolvePath(`${fileId}.metadata`);

		await fs.writeFile(filePath, JSON.stringify(metadata), { encoding: 'utf-8' });
	}

	private async getSize(fileId: string) {
		const filePath = this.getPath(fileId);

		try {
			const stats = await fs.stat(filePath);
			return stats.size;
		} catch (error) {
			throw new Error('Failed to find binary data file in filesystem', { cause: error });
		}
	}
}
