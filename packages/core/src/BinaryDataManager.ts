import { parse } from 'flatted';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import {
	IBinaryData,
	IDataObject,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import { BINARY_ENCODING } from './Constants';
import { IBinaryDataConfig, IExecutionFlattedDb } from './Interfaces';

export class BinaryDataHelper {
	private static instance: BinaryDataHelper;

	private storageMode: string;

	private storagePath: string;

	private managerId: string;

	constructor(mode: string, storagePath: string) {
		this.storageMode = mode;
		this.storagePath = storagePath;
		this.managerId = `manager-${uuid()}`;
	}

	static async init(config: IBinaryDataConfig, clearOldData = false): Promise<void> {
		if (BinaryDataHelper.instance) {
			throw new Error('Binary Data Manager already initialized');
		}

		BinaryDataHelper.instance = new BinaryDataHelper(config.mode, config.localStoragePath);
		if (clearOldData) {
			await BinaryDataHelper.instance.deleteMarkedFiles();
		}

		if (config.mode === 'LOCAL_STORAGE') {
			return fs
				.readdir(BinaryDataHelper.instance.storagePath)
				.catch(async () => fs.mkdir(BinaryDataHelper.instance.storagePath))
				.then(() => {});
		}

		return undefined;
	}

	static getInstance(): BinaryDataHelper {
		if (!BinaryDataHelper.instance) {
			throw new Error('Binary Data Manager not initialized');
		}

		return BinaryDataHelper.instance;
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData> {
		const retBinaryData = binaryData;
		if (this.storageMode === 'LOCAL_STORAGE') {
			retBinaryData.internalIdentifier = this.generateIdentifier();
			return this.saveToLocalStorage(binaryBuffer, retBinaryData.internalIdentifier).then(
				() => retBinaryData,
			);
		}

		retBinaryData.data = binaryBuffer.toString(BINARY_ENCODING);
		return binaryData;
	}

	async retrieveBinaryData(binaryData: IBinaryData): Promise<Buffer> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			if (!binaryData.internalIdentifier) {
				throw new Error('Binary data is missing identifier');
			}

			return this.retrieveBinaryDataByIdentifier(binaryData.internalIdentifier);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			return this.retrieveFromLocalStorage(identifier);
		}

		throw new Error('Binary data storage mode is set to default');
	}

	findAndMarkDataForDeletionFromFullRunData(fullRunData: IRun): void {
		const identifiers = this.findBinaryDataFromRunData(fullRunData.data.resultData.runData);
		void this.markDataForDeletion(identifiers);
	}

	findAndMarkDataForDeletion(fullExecutionDataList: IExecutionFlattedDb[]): void {
		const identifiers = this.findBinaryData(fullExecutionDataList);
		void this.markDataForDeletion(identifiers);
	}

	generateIdentifier(): string {
		return uuid();
	}

	private async markDataForDeletion(identifiers: string[]): Promise<void> {
		const currentFiles = await this.getFilesToDelete(`meta-${this.managerId}.json`);
		const filesToDelete = identifiers.reduce((acc: IDataObject, cur: string) => {
			acc[cur] = 1;
			return acc;
		}, currentFiles);

		setTimeout(async () => {
			const currentFilesToDelete = await this.getFilesToDelete(`meta-${this.managerId}.json`);
			identifiers.forEach(async (identifier) => {
				void this.deleteBinaryDataByIdentifier(identifier);
				delete currentFilesToDelete[identifier];
			});

			void this.writeDeletionIdsToFile(currentFilesToDelete);
		}, 60000 * 60); // 1 hour

		return this.writeDeletionIdsToFile(filesToDelete);
	}

	private getBinaryDataMetaPath() {
		return path.join(this.storagePath, 'meta');
	}

	private async writeDeletionIdsToFile(filesToDelete: IDataObject): Promise<void> {
		return fs.writeFile(
			path.join(this.getBinaryDataMetaPath(), `meta-${this.managerId}.json`),
			JSON.stringify(filesToDelete, null, '\t'),
		);
	}

	private async getFilesToDelete(metaFilename: string): Promise<IDataObject> {
		let filesToDelete = {};
		try {
			const file = await fs.readFile(path.join(this.getBinaryDataMetaPath(), metaFilename), 'utf8');

			filesToDelete = JSON.parse(file) as IDataObject;
		} catch {
			return {};
		}

		return filesToDelete;
	}

	async findAndDeleteBinaryData(fullExecutionDataList: IExecutionFlattedDb[]): Promise<unknown> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			const allIdentifiers: string[] = [];

			fullExecutionDataList.forEach((fullExecutionData) => {
				const { runData } = (parse(fullExecutionData.data) as IRunExecutionData).resultData;

				allIdentifiers.push(...this.findBinaryDataFromRunData(runData));
			});

			return Promise.all(
				allIdentifiers.map(async (identifier) => this.deleteBinaryDataByIdentifier(identifier)),
			);
		}

		return Promise.resolve();
	}

	private async deleteMarkedFiles(): Promise<unknown> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			const metaFileNames = (await fs.readdir(this.getBinaryDataMetaPath())).filter((filename) =>
				filename.startsWith('meta-manager'),
			);

			const deletePromises = metaFileNames.map(async (metaFile) =>
				this.deleteMarkedFilesByMetaFile(metaFile).then(async () =>
					this.deleteMetaFileByName(metaFile),
				),
			);

			return Promise.all(deletePromises).finally(async () => this.writeDeletionIdsToFile({}));
		}

		return Promise.resolve();
	}

	private async deleteMarkedFilesByMetaFile(metaFilename: string): Promise<void> {
		return this.getFilesToDelete(metaFilename).then(async (filesToDelete) => {
			return Promise.all(
				Object.keys(filesToDelete).map(async (identifier) =>
					this.deleteBinaryDataByIdentifier(identifier).catch(() => {}),
				),
			).then(() => {});
		});
	}

	private findBinaryData(fullExecutionDataList: IExecutionFlattedDb[]): string[] {
		const allIdentifiers: string[] = [];
		fullExecutionDataList.forEach((fullExecutionData) => {
			const { runData } = (parse(fullExecutionData.data) as IRunExecutionData).resultData;
			allIdentifiers.push(...this.findBinaryDataFromRunData(runData));
		});

		return allIdentifiers;
	}

	private findBinaryDataFromRunData(runData: IRunData): string[] {
		const allIdentifiers: string[] = [];

		Object.values(runData).forEach((item: ITaskData[]) => {
			item.forEach((taskData) => {
				if (taskData?.data) {
					Object.values(taskData.data).forEach((connectionData) => {
						connectionData.forEach((executionData) => {
							if (executionData) {
								executionData.forEach((element) => {
									if (element?.binary) {
										Object.values(element?.binary).forEach((binaryItem) => {
											if (binaryItem.internalIdentifier) {
												allIdentifiers.push(binaryItem.internalIdentifier);
											}
										});
									}
								});
							}
						});
					});
				}
			});
		});

		return allIdentifiers;
	}

	private async deleteMetaFileByName(filename: string): Promise<void> {
		return fs.rm(path.join(this.getBinaryDataMetaPath(), filename));
	}

	private async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			return this.deleteFromLocalStorage(identifier);
		}

		return undefined;
	}

	private async deleteFromLocalStorage(identifier: string) {
		return fs.rm(path.join(this.storagePath, identifier));
	}

	private async saveToLocalStorage(data: Buffer, identifier: string) {
		await fs.writeFile(path.join(this.storagePath, identifier), data);
	}

	private async retrieveFromLocalStorage(identifier: string) {
		const filePath = path.join(this.storagePath, identifier);
		try {
			return await fs.readFile(filePath);
		} catch (e) {
			throw new Error(`Error finding file: ${filePath}`);
		}
	}
}
