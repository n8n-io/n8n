import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { jsonParse } from 'n8n-workflow';

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

	async getSize(fileId: string) {
		const filePath = this.getPath(fileId);
		const stats = await fs.stat(filePath);

		return stats.size;
	}

	getAsStream(fileId: string, chunkSize?: number) {
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
		binaryData: Buffer | Readable,
		executionId: string,
		{ mimeType, fileName }: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.createFileId(executionId);
		const filePath = this.getPath(fileId);

		await fs.writeFile(filePath, binaryData);

		const fileSize = await this.getSize(fileId);

		await this.storeMetadata(fileId, { mimeType, fileName, fileSize });

		return { fileId, fileSize };
	}

	async deleteOne(fileId: string) {
		const filePath = this.getPath(fileId);

		return fs.rm(filePath);
	}

	async deleteManyByExecutionIds(executionIds: string[]) {
		const set = new Set(executionIds);
		const fileNames = await fs.readdir(this.storagePath);
		const deletedIds = [];

		for (const fileName of fileNames) {
			const executionId = fileName.match(EXECUTION_ID_EXTRACTOR)?.[1];

			if (executionId && set.has(executionId)) {
				const filePath = this.resolvePath(fileName);

				await Promise.all([fs.rm(filePath), fs.rm(`${filePath}.metadata`)]);

				deletedIds.push(executionId);
			}
		}

		return deletedIds;
	}

	async copyByFilePath(
		filePath: string,
		executionId: string,
		{ mimeType, fileName }: BinaryData.PreWriteMetadata,
	) {
		const newFileId = this.createFileId(executionId);

		await fs.cp(filePath, this.getPath(newFileId));

		const fileSize = await this.getSize(newFileId);

		await this.storeMetadata(newFileId, { mimeType, fileName, fileSize });

		return { fileId: newFileId, fileSize };
	}

	async copyByFileId(fileId: string, executionId: string) {
		const newFileId = this.createFileId(executionId);

		await fs.copyFile(this.resolvePath(fileId), this.resolvePath(newFileId));

		return newFileId;
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private createFileId(executionId: string) {
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
}
