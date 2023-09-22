import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { jsonParse } from 'n8n-workflow';

import { FileNotFoundError } from '../errors';

import type { Readable } from 'stream';
import type { BinaryMetadata } from 'n8n-workflow';
import type { BinaryData } from './types';

const EXECUTION_ID_EXTRACTOR =
	/^(\w+)(?:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

export class FileSystemManager implements BinaryData.Manager {
	constructor(private storagePath: string) {}

	async init() {
		await this.ensureDirExists(this.storagePath);
	}

	getPath(identifier: string) {
		return this.resolvePath(identifier);
	}

	async getSize(identifier: string) {
		const filePath = this.getPath(identifier);

		try {
			const stats = await fs.stat(filePath);
			return stats.size;
		} catch (error) {
			throw new Error('Failed to find binary data file in filesystem', { cause: error });
		}
	}

	getStream(identifier: string, chunkSize?: number) {
		const filePath = this.getPath(identifier);

		return createReadStream(filePath, { highWaterMark: chunkSize });
	}

	async getBuffer(identifier: string) {
		const filePath = this.getPath(identifier);

		try {
			return await fs.readFile(filePath);
		} catch {
			throw new Error(`Error finding file: ${filePath}`);
		}
	}

	async storeMetadata(identifier: string, metadata: BinaryMetadata) {
		const filePath = this.resolvePath(`${identifier}.metadata`);

		await fs.writeFile(filePath, JSON.stringify(metadata), { encoding: 'utf-8' });
	}

	async getMetadata(identifier: string): Promise<BinaryMetadata> {
		const filePath = this.resolvePath(`${identifier}.metadata`);

		return jsonParse(await fs.readFile(filePath, { encoding: 'utf-8' }));
	}

	async store(binaryData: Buffer | Readable, executionId: string) {
		const identifier = this.createIdentifier(executionId);
		const filePath = this.getPath(identifier);

		await fs.writeFile(filePath, binaryData);

		return identifier;
	}

	async deleteOne(identifier: string) {
		const filePath = this.getPath(identifier);

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

	async copyByPath(filePath: string, executionId: string) {
		const identifier = this.createIdentifier(executionId);

		await fs.cp(filePath, this.getPath(identifier));

		return identifier;
	}

	async copyByIdentifier(identifier: string, executionId: string) {
		const newIdentifier = this.createIdentifier(executionId);

		await fs.copyFile(this.resolvePath(identifier), this.resolvePath(newIdentifier));

		return newIdentifier;
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private async ensureDirExists(dir: string) {
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}
	}

	private createIdentifier(executionId: string) {
		return [executionId, uuid()].join('');
	}

	private resolvePath(...args: string[]) {
		const returnPath = path.join(this.storagePath, ...args);

		if (path.relative(this.storagePath, returnPath).startsWith('..')) {
			throw new FileNotFoundError('Invalid path detected');
		}

		return returnPath;
	}
}
