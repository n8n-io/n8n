import glob from 'fast-glob';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { Readable } from 'stream';
import type { BinaryMetadata } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';
import { FileNotFoundError } from '../errors';

const PREFIX_METAFILE = 'binarymeta';
const PREFIX_PERSISTED_METAFILE = 'persistedmeta';

const executionExtractionRegexp =
	/^(\w+)(?:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

export class BinaryDataFileSystem implements IBinaryDataManager {
	private storagePath: string;

	private binaryDataTTL: number;

	private persistedBinaryDataTTL: number;

	constructor(config: IBinaryDataConfig) {
		this.storagePath = config.localStoragePath;
		this.binaryDataTTL = config.binaryDataTTL;
		this.persistedBinaryDataTTL = config.persistedBinaryDataTTL;
	}

	async init(startPurger = false): Promise<void> {
		if (startPurger) {
			setInterval(async () => {
				await this.deleteMarkedFiles();
			}, this.binaryDataTTL * 30000);

			setInterval(async () => {
				await this.deleteMarkedPersistedFiles();
			}, this.persistedBinaryDataTTL * 30000);
		}

		await this.assertFolder(this.storagePath);
		await this.assertFolder(this.getBinaryDataMetaPath());
		await this.assertFolder(this.getBinaryDataPersistMetaPath());

		await this.deleteMarkedFiles();
		await this.deleteMarkedPersistedFiles();
	}

	async getFileSize(identifier: string): Promise<number> {
		const stats = await fs.stat(this.getBinaryPath(identifier));
		return stats.size;
	}

	async copyBinaryFile(filePath: string, executionId: string): Promise<string> {
		const binaryDataId = this.generateFileName(executionId);
		await this.addBinaryIdToPersistMeta(executionId, binaryDataId);
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
		await this.addBinaryIdToPersistMeta(executionId, binaryDataId);
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

	async markDataForDeletionByExecutionId(executionId: string): Promise<void> {
		const tt = new Date(new Date().getTime() + this.binaryDataTTL * 60000);
		return fs.writeFile(
			this.resolveStoragePath('meta', `${PREFIX_METAFILE}_${executionId}_${tt.valueOf()}`),
			'',
		);
	}

	async deleteMarkedFiles(): Promise<void> {
		return this.deleteMarkedFilesByMeta(this.getBinaryDataMetaPath(), PREFIX_METAFILE);
	}

	async deleteMarkedPersistedFiles(): Promise<void> {
		return this.deleteMarkedFilesByMeta(
			this.getBinaryDataPersistMetaPath(),
			PREFIX_PERSISTED_METAFILE,
		);
	}

	private async addBinaryIdToPersistMeta(executionId: string, identifier: string): Promise<void> {
		const currentTime = new Date().getTime();
		const timeAtNextHour = currentTime + 3600000 - (currentTime % 3600000);
		const timeoutTime = timeAtNextHour + this.persistedBinaryDataTTL * 60000;

		const filePath = this.resolveStoragePath(
			'persistMeta',
			`${PREFIX_PERSISTED_METAFILE}_${executionId}_${timeoutTime}`,
		);

		try {
			await fs.access(filePath);
		} catch {
			await fs.writeFile(filePath, identifier);
		}
	}

	private async deleteMarkedFilesByMeta(metaPath: string, filePrefix: string): Promise<void> {
		const currentTimeValue = new Date().valueOf();
		const metaFileNames = await glob(`${filePrefix}_*`, { cwd: metaPath });

		const executionIds = metaFileNames
			.map((f) => f.split('_') as [string, string, string])
			.filter(([prefix, , ts]) => {
				if (prefix !== filePrefix) return false;
				const execTimestamp = parseInt(ts, 10);
				return execTimestamp < currentTimeValue;
			})
			.map((e) => e[1]);

		const filesToDelete = [];
		const deletedIds = await this.deleteBinaryDataByExecutionIds(executionIds);
		for (const executionId of deletedIds) {
			filesToDelete.push(
				...(await glob(`${filePrefix}_${executionId}_`, {
					absolute: true,
					cwd: metaPath,
				})),
			);
		}
		await Promise.all(filesToDelete.map(async (file) => fs.rm(file)));
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

	async persistBinaryDataForExecutionId(executionId: string): Promise<void> {
		const metaFiles = await fs.readdir(this.getBinaryDataPersistMetaPath());
		const promises = metaFiles.reduce<Array<Promise<void>>>((prev, curr) => {
			if (curr.startsWith(`${PREFIX_PERSISTED_METAFILE}_${executionId}_`)) {
				prev.push(fs.rm(path.join(this.getBinaryDataPersistMetaPath(), curr)));
				return prev;
			}

			return prev;
		}, []);
		await Promise.all(promises);
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

	private getBinaryDataPersistMetaPath() {
		return path.join(this.storagePath, 'persistMeta');
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
