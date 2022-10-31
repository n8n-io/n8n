import { IBinaryData, INodeExecutionData } from 'n8n-workflow';
import { BINARY_ENCODING } from '../Constants';
import { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';
import { BinaryDataFileSystem } from './FileSystem';

export class BinaryDataManager {
	static instance: BinaryDataManager | undefined;

	private managers: {
		[key: string]: IBinaryDataManager;
	};

	private binaryDataMode: string;

	private availableModes: string[];

	constructor(config: IBinaryDataConfig) {
		this.binaryDataMode = config.mode;
		this.availableModes = config.availableModes.split(',');
		this.managers = {};
	}

	static async init(config: IBinaryDataConfig, mainManager = false): Promise<void> {
		if (BinaryDataManager.instance) {
			throw new Error('Binary Data Manager already initialized');
		}

		BinaryDataManager.instance = new BinaryDataManager(config);

		if (BinaryDataManager.instance.availableModes.includes('filesystem')) {
			BinaryDataManager.instance.managers.filesystem = new BinaryDataFileSystem(config);
			await BinaryDataManager.instance.managers.filesystem.init(mainManager);
		}

		return undefined;
	}

	static getInstance(): BinaryDataManager {
		if (!BinaryDataManager.instance) {
			throw new Error('Binary Data Manager not initialized');
		}

		return BinaryDataManager.instance;
	}

	async storeBinaryData(
		binaryData: IBinaryData,
		binaryBuffer: Buffer,
		executionId: string,
	): Promise<IBinaryData> {
		const retBinaryData = binaryData;

		// If a manager handles this binary, return the binary data with it's reference id.
		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode]
				.storeBinaryData(binaryBuffer, executionId)
				.then((filename) => {
					// Add data manager reference id.
					retBinaryData.id = this.generateBinaryId(filename);

					// Prevent preserving data in memory if handled by a data manager.
					retBinaryData.data = this.binaryDataMode;

					// Short-circuit return to prevent further actions.
					return retBinaryData;
				});
		}

		// Else fallback to storing this data in memory.
		retBinaryData.data = binaryBuffer.toString(BINARY_ENCODING);
		return binaryData;
	}

	async retrieveBinaryData(binaryData: IBinaryData): Promise<Buffer> {
		if (binaryData.id) {
			return this.retrieveBinaryDataByIdentifier(binaryData.id);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].retrieveBinaryDataByIdentifier(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async markDataForDeletionByExecutionId(executionId: string): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode].markDataForDeletionByExecutionId(executionId);
		}

		return Promise.resolve();
	}

	async persistBinaryDataForExecutionId(executionId: string): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode].persistBinaryDataForExecutionId(executionId);
		}

		return Promise.resolve();
	}

	async deleteBinaryDataByExecutionId(executionId: string): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode].deleteBinaryDataByExecutionId(executionId);
		}

		return Promise.resolve();
	}

	async duplicateBinaryData(
		inputData: Array<INodeExecutionData[] | null> | unknown,
		executionId: string,
	): Promise<INodeExecutionData[][]> {
		if (inputData && this.managers[this.binaryDataMode]) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return Promise.all(
							executionDataArray.map((executionData) => {
								if (executionData.binary) {
									return this.duplicateBinaryDataInExecData(executionData, executionId);
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

	private generateBinaryId(filename: string) {
		return `${this.binaryDataMode}:${filename}`;
	}

	private splitBinaryModeFileId(fileId: string): { mode: string; id: string } {
		const [mode, id] = fileId.split(':');
		return { mode, id };
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
		executionId: string,
	): Promise<INodeExecutionData> {
		const binaryManager = this.managers[this.binaryDataMode];

		if (executionData.binary) {
			const binaryDataKeys = Object.keys(executionData.binary);
			const bdPromises = binaryDataKeys.map(async (key: string) => {
				if (!executionData.binary) {
					return { key, newId: undefined };
				}

				const binaryDataId = executionData.binary[key].id;
				if (!binaryDataId) {
					return { key, newId: undefined };
				}

				return binaryManager
					?.duplicateBinaryDataByIdentifier(
						this.splitBinaryModeFileId(binaryDataId).id,
						executionId,
					)
					.then((filename) => ({
						newId: this.generateBinaryId(filename),
						key,
					}));
			});

			return Promise.all(bdPromises).then((b) => {
				return b.reduce((acc, curr) => {
					if (acc.binary && curr) {
						acc.binary[curr.key].id = curr.newId;
					}

					return acc;
				}, executionData);
			});
		}

		return executionData;
	}
}
