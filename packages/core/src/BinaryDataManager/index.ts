import { parse } from 'flatted';
import {
	IBinaryData,
	INodeExecutionData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import { BINARY_ENCODING } from '../Constants';
import { IBinaryDataConfig, IBinaryDataManager, IExecutionFlattedDb } from '../Interfaces';
import { BinaryDataLocalStorage } from './LocalStorage';

export class BinaryDataManager {
	private static instance: BinaryDataManager;

	private manager?: IBinaryDataManager;

	static async init(config: IBinaryDataConfig, mainManager = false): Promise<void> {
		if (BinaryDataManager.instance) {
			throw new Error('Binary Data Manager already initialized');
		}

		BinaryDataManager.instance = new BinaryDataManager();

		if (config.mode === 'LOCAL_STORAGE') {
			BinaryDataManager.instance.manager = new BinaryDataLocalStorage();
			await BinaryDataManager.instance.manager.init(config, mainManager);
		}

		return undefined;
	}

	static getInstance(): BinaryDataManager {
		if (!BinaryDataManager.instance) {
			throw new Error('Binary Data Manager not initialized');
		}

		return BinaryDataManager.instance;
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData> {
		if (this.manager) {
			return this.manager.storeBinaryData(binaryData, binaryBuffer);
		}

		const retBinaryData = binaryData;
		retBinaryData.data = binaryBuffer.toString(BINARY_ENCODING);
		return binaryData;
	}

	async retrieveBinaryData(binaryData: IBinaryData): Promise<Buffer> {
		if (this.manager) {
			if (!binaryData.internalIdentifier) {
				throw new Error('Binary data is missing identifier');
			}

			return this.retrieveBinaryDataByIdentifier(binaryData.internalIdentifier);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		if (this.manager) {
			return this.manager.retrieveBinaryDataByIdentifier(identifier);
		}

		throw new Error('Binary data storage mode is set to default');
	}

	async findAndMarkDataForDeletionFromFullRunData(fullRunData: IRun): Promise<void> {
		const identifiers = this.findBinaryDataFromRunData(fullRunData.data.resultData.runData);
		return this.markDataForDeletion(identifiers);
	}

	findAndMarkDataForDeletion(fullExecutionDataList: IExecutionFlattedDb[]): void {
		const identifiers = this.findBinaryData(fullExecutionDataList);
		void this.markDataForDeletion(identifiers);
	}

	async findAndDeleteBinaryData(fullExecutionDataList: IExecutionFlattedDb[]): Promise<unknown> {
		if (this.manager) {
			const allIdentifiers: string[] = [];

			fullExecutionDataList.forEach((fullExecutionData) => {
				const { runData } = (parse(fullExecutionData.data) as IRunExecutionData).resultData;

				allIdentifiers.push(...this.findBinaryDataFromRunData(runData));
			});

			return Promise.all(
				allIdentifiers.map(async (identifier) =>
					this.manager?.deleteBinaryDataByIdentifier(identifier),
				),
			);
		}

		return Promise.resolve();
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
	): Promise<INodeExecutionData> {
		if (this.manager && executionData.binary) {
			const binaryDataKeys = Object.keys(executionData.binary);
			const bdPromises = binaryDataKeys.map(async (key: string) => {
				if (!executionData.binary) {
					return { key, newIdentifier: undefined };
				}

				const identifier = executionData.binary[key].internalIdentifier;
				if (!identifier) {
					return { key, newIdentifier: undefined };
				}

				return this.manager?.duplicateBinaryDataByIdentifier(identifier).then((newIdentifier) => ({
					newIdentifier,
					key,
				}));
			});

			return Promise.all(bdPromises).then((b) => {
				return b.reduce((acc, curr) => {
					if (acc.binary && curr) {
						acc.binary[curr.key].internalIdentifier = curr.newIdentifier;
					}

					return acc;
				}, executionData);
			});
		}

		return executionData;
	}

	async duplicateBinaryData(
		inputData: Array<INodeExecutionData[] | null> | unknown,
	): Promise<INodeExecutionData[][]> {
		if (inputData && this.manager) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return Promise.all(
							executionDataArray.map((executionData) => {
								if (executionData.binary) {
									return this.duplicateBinaryDataInExecData(executionData);
								}

								return executionData;
							}),
						);
					}

					return executionDataArray;
				},
			);

			return Promise.all(returnInputData);
		}

		return Promise.resolve(inputData as INodeExecutionData[][]);
	}

	private async markDataForDeletion(identifiers: string[]): Promise<void> {
		if (this.manager) {
			return this.manager.markDataForDeletion(identifiers);
		}

		return Promise.resolve();
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
}
