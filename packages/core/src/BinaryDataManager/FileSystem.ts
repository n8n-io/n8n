import fs from 'fs/promises';
import { jsonParse } from 'n8n-workflow';
import path from 'path';
import { v4 as uuid } from 'uuid';
import type { Readable } from 'stream';

import { BinaryMetadata, IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';

const PREFIX_METAFILE = 'binarymeta';
const PREFIX_PERSISTED_METAFILE = 'persistedmeta';

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

		return fs
			.readdir(this.storagePath)
			.catch(async () => fs.mkdir(this.storagePath, { recursive: true }))
			.then(async () => fs.readdir(this.getBinaryDataMetaPath()))
			.catch(async () => fs.mkdir(this.getBinaryDataMetaPath(), { recursive: true }))
			.then(async () => fs.readdir(this.getBinaryDataPersistMetaPath()))
			.catch(async () => fs.mkdir(this.getBinaryDataPersistMetaPath(), { recursive: true }))
			.then(async () => this.deleteMarkedFiles())
			.then(async () => this.deleteMarkedPersistedFiles())
			.then(() => {});
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

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		return this.retrieveFromLocalStorage(identifier);
	}

	getBinaryPath(identifier: string): string {
		return path.join(this.storagePath, identifier);
	}

	getMetadataPath(identifier: string): string {
		return path.join(this.storagePath, `${identifier}.metadata`);
	}

	async markDataForDeletionByExecutionId(executionId: string): Promise<void> {
		const tt = new Date(new Date().getTime() + this.binaryDataTTL * 60000);
		return fs.writeFile(
			path.join(this.getBinaryDataMetaPath(), `${PREFIX_METAFILE}_${executionId}_${tt.valueOf()}`),
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

		const filePath = path.join(
			this.getBinaryDataPersistMetaPath(),
			`${PREFIX_PERSISTED_METAFILE}_${executionId}_${timeoutTime}`,
		);

		return fs
			.readFile(filePath)
			.catch(async () => fs.writeFile(filePath, identifier))
			.then(() => {});
	}

	private async deleteMarkedFilesByMeta(metaPath: string, filePrefix: string): Promise<void> {
		const currentTimeValue = new Date().valueOf();
		const metaFileNames = await fs.readdir(metaPath);

		const execsAdded: { [key: string]: number } = {};

		const proms = metaFileNames.reduce(
			(prev, curr) => {
				const [prefix, executionId, ts] = curr.split('_');

				if (prefix !== filePrefix) {
					return prev;
				}

				const execTimestamp = parseInt(ts, 10);

				if (execTimestamp < currentTimeValue) {
					if (execsAdded[executionId]) {
						// do not delete data, only meta file
						prev.push(this.deleteMetaFileByPath(path.join(metaPath, curr)));
						return prev;
					}

					execsAdded[executionId] = 1;
					prev.push(
						this.deleteBinaryDataByExecutionId(executionId).then(async () =>
							this.deleteMetaFileByPath(path.join(metaPath, curr)),
						),
					);
				}

				return prev;
			},
			[Promise.resolve()],
		);

		return Promise.all(proms).then(() => {});
	}

	async duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string> {
		const newBinaryDataId = this.generateFileName(prefix);

		return fs
			.copyFile(
				path.join(this.storagePath, binaryDataId),
				path.join(this.storagePath, newBinaryDataId),
			)
			.then(() => newBinaryDataId);
	}

	async deleteBinaryDataByExecutionId(executionId: string): Promise<void> {
		const regex = new RegExp(`${executionId}_*`);
		const filenames = await fs.readdir(path.join(this.storagePath));

		const proms = filenames.reduce(
			(allProms, filename) => {
				if (regex.test(filename)) {
					allProms.push(fs.rm(path.join(this.storagePath, filename)));
				}

				return allProms;
			},
			[Promise.resolve()],
		);

		return Promise.all(proms).then(async () => Promise.resolve());
	}

	async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		return this.deleteFromLocalStorage(identifier);
	}

	async persistBinaryDataForExecutionId(executionId: string): Promise<void> {
		return fs.readdir(this.getBinaryDataPersistMetaPath()).then(async (metafiles) => {
			const proms = metafiles.reduce(
				(prev, curr) => {
					if (curr.startsWith(`${PREFIX_PERSISTED_METAFILE}_${executionId}_`)) {
						prev.push(fs.rm(path.join(this.getBinaryDataPersistMetaPath(), curr)));
						return prev;
					}

					return prev;
				},
				[Promise.resolve()],
			);

			return Promise.all(proms).then(() => {});
		});
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

	private async deleteMetaFileByPath(metafilePath: string): Promise<void> {
		return fs.rm(metafilePath);
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
}
