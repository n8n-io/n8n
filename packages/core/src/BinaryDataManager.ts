import { parse } from 'flatted';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { IBinaryData, IRunExecutionData, ITaskData } from 'n8n-workflow';
import { BINARY_ENCODING } from './Constants';
import { IBinaryDataConfig, IExecutionFlattedDb } from './Interfaces';

export class BinaryDataHelper {
	private static instance: BinaryDataHelper;

	private storageMode: string;

	private storagePath: string;

	constructor(mode: string, storagePath: string) {
		this.storageMode = mode;
		this.storagePath = storagePath;
	}

	static async init(config: IBinaryDataConfig): Promise<void> {
		if (BinaryDataHelper.instance) {
			throw new Error('Binary Data Manager already initialized');
		}

		BinaryDataHelper.instance = new BinaryDataHelper(config.mode, config.localStoragePath);

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

	generateIdentifier(): string {
		return uuid();
	}

	async findAndDeleteBinaryData(fullExecutionDataList: IExecutionFlattedDb[]): Promise<unknown> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			const allIdentifiers: string[] = [];

			fullExecutionDataList.forEach((fullExecutionData) => {
				const { runData } = (parse(fullExecutionData.data) as IRunExecutionData).resultData;

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
			});

			return Promise.all(
				allIdentifiers.map(async (identifier) => this.deleteBinaryDataByIdentifier(identifier)),
			);
		}

		return Promise.resolve();
	}

	async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			console.log('deleting: ', identifier);
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
		return fs.readFile(path.join(this.storagePath, identifier));
	}
}
