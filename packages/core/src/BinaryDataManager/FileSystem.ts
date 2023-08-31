import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { Readable } from 'stream';
import type { BinaryMetadata } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';
import { FileNotFoundError } from '../errors';

const executionExtractionRegexp =
	/^(\w+)(?:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

export class BinaryDataFileSystem implements IBinaryDataManager {
	private storagePath: string;

	constructor(config: IBinaryDataConfig) {
		this.storagePath = config.localStoragePath;
	}

	async init(): Promise<void> {
		await this.assertFolder(this.storagePath);
		await this.assertFolder(this.getBinaryDataMetaPath());
	}

	async getFileSize(identifier: string): Promise<number> {
		const stats = await fs.stat(this.getBinaryPath(identifier));
		return stats.size;
	}

	async copyBinaryFile(filePath: string, executionId: string): Promise<string> {
		const binaryDataId = this.generateFileName(executionId);
		await this.copyFileToLocalStorage(filePath, binaryDataId);
		return binaryDataId;
	}

	async storeBinaryMetadata(identifier: string, metadata: BinaryMetadata) {
		await fs.writeFile(this.getMetadataPath(identifier), JSON.stringify(metadata), {
			encoding: 'utf-8',
		});
	}

	async getBinaryMetadata(identifier: string): Promise<BinaryMetadata> {
		return jsonParse(await fs.readFile(this.getMetadataPath(identifier), { encoding: 'utf-8' }));
	}

	async storeBinaryData(binaryData: Buffer | Readable, executionId: string): Promise<string> {
		const binaryDataId = this.generateFileName(executionId);
		await this.saveToLocalStorage(binaryData, binaryDataId);
		return binaryDataId;
	}

	getBinaryStream(identifier: string, chunkSize?: number): Readable {
		return createReadStream(this.getBinaryPath(identifier), { highWaterMark: chunkSize });
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		return this.retrieveFromLocalStorage(identifier);
	}

	getBinaryPath(identifier: string): string {
		return this.resolveStoragePath(identifier);
	}

	getMetadataPath(identifier: string): string {
		return this.resolveStoragePath(`${identifier}.metadata`);
	}

	async duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string> {
		const newBinaryDataId = this.generateFileName(prefix);
		await fs.copyFile(
			this.resolveStoragePath(binaryDataId),
			this.resolveStoragePath(newBinaryDataId),
		);
		return newBinaryDataId;
	}

	async deleteBinaryDataByExecutionIds(executionIds: string[]): Promise<string[]> {
		// TODO: switch over to new folder structure, and delete folders instead
		const set = new Set(executionIds);
		const fileNames = await fs.readdir(this.storagePath);
		const deletedIds = [];
		for (const fileName of fileNames) {
			const executionId = fileName.match(executionExtractionRegexp)?.[1];
			if (executionId && set.has(executionId)) {
				const filePath = this.resolveStoragePath(fileName);
				await Promise.all([fs.rm(filePath), fs.rm(`${filePath}.metadata`)]);
				deletedIds.push(executionId);
			}
		}
		return deletedIds;
	}

	async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		return this.deleteFromLocalStorage(identifier);
	}

	private async assertFolder(folder: string): Promise<void> {
		try {
			await fs.access(folder);
		} catch {
			await fs.mkdir(folder, { recursive: true });
		}
	}

	private generateFileName(prefix: string): string {
		return [prefix, uuid()].join('');
	}

	private getBinaryDataMetaPath() {
		return path.join(this.storagePath, 'meta');
	}

	private async deleteFromLocalStorage(identifier: string) {
		return fs.rm(this.getBinaryPath(identifier));
	}

	private async copyFileToLocalStorage(source: string, identifier: string): Promise<void> {
		await fs.cp(source, this.getBinaryPath(identifier));
	}

	private async saveToLocalStorage(binaryData: Buffer | Readable, identifier: string) {
		await fs.writeFile(this.getBinaryPath(identifier), binaryData);
	}

	private async retrieveFromLocalStorage(identifier: string): Promise<Buffer> {
		const filePath = this.getBinaryPath(identifier);
		try {
			return await fs.readFile(filePath);
		} catch (e) {
			throw new Error(`Error finding file: ${filePath}`);
		}
	}

	private resolveStoragePath(...args: string[]) {
		const returnPath = path.join(this.storagePath, ...args);
		if (path.relative(this.storagePath, returnPath).startsWith('..'))
			throw new FileNotFoundError('Invalid path detected');
		return returnPath;
	}
}
