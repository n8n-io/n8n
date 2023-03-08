import { readFile, stat } from 'fs/promises';
import type { BinaryMetadata, IBinaryData, INodeExecutionData } from 'n8n-workflow';
import prettyBytes from 'pretty-bytes';
import type { Readable } from 'stream';
import { BINARY_ENCODING } from '../Constants';
import type { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';
import { BinaryDataFileSystem } from './FileSystem';
import { binaryToBuffer } from './utils';

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

	async copyBinaryFile(
		binaryData: IBinaryData,
		filePath: string,
		executionId: string,
	): Promise<IBinaryData> {
		// If a manager handles this binary, copy over the binary file and return its reference id.
		const manager = this.managers[this.binaryDataMode];
		if (manager) {
			const identifier = await manager.copyBinaryFile(filePath, executionId);
			// Add data manager reference id.
			binaryData.id = this.generateBinaryId(identifier);

			// Prevent preserving data in memory if handled by a data manager.
			binaryData.data = this.binaryDataMode;

			const fileSize = await manager.getFileSize(identifier);
			binaryData.fileSize = prettyBytes(fileSize);

			await manager.storeBinaryMetadata(identifier, {
				fileName: binaryData.fileName,
				mimeType: binaryData.mimeType,
				fileSize,
			});
		} else {
			const { size } = await stat(filePath);
			binaryData.fileSize = prettyBytes(size);
			binaryData.data = await readFile(filePath, { encoding: BINARY_ENCODING });
		}

		return binaryData;
	}

	async storeBinaryData(
		binaryData: IBinaryData,
		input: Buffer | Readable,
		executionId: string,
	): Promise<IBinaryData> {
		// If a manager handles this binary, return the binary data with its reference id.
		const manager = this.managers[this.binaryDataMode];
		if (manager) {
			const identifier = await manager.storeBinaryData(input, executionId);

			// Add data manager reference id.
			binaryData.id = this.generateBinaryId(identifier);

			// Prevent preserving data in memory if handled by a data manager.
			binaryData.data = this.binaryDataMode;

			const fileSize = await manager.getFileSize(identifier);
			binaryData.fileSize = prettyBytes(fileSize);

			await manager.storeBinaryMetadata(identifier, {
				fileName: binaryData.fileName,
				mimeType: binaryData.mimeType,
				fileSize,
			});
		} else {
			const buffer = await binaryToBuffer(input);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);
		}

		return binaryData;
	}

	getBinaryStream(identifier: string, chunkSize?: number): Readable {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].getBinaryStream(id, chunkSize);
		}

		throw new Error('Storage mode used to store binary data not available');
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

	getBinaryPath(identifier: string): string {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].getBinaryPath(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async getBinaryMetadata(identifier: string): Promise<BinaryMetadata> {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].getBinaryMetadata(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async markDataForDeletionByExecutionId(executionId: string): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode].markDataForDeletionByExecutionId(executionId);
		}

		return Promise.resolve();
	}

	async markDataForDeletionByExecutionIds(executionIds: string[]): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			return Promise.all(
				executionIds.map(async (id) =>
					this.managers[this.binaryDataMode].markDataForDeletionByExecutionId(id),
				),
			).then(() => {});
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
