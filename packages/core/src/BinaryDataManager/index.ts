import { readFile, stat } from 'fs/promises';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';
import prettyBytes from 'pretty-bytes';
import type { Readable } from 'stream';
import { BINARY_ENCODING } from 'n8n-workflow';
import type { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';
import { BinaryDataFileSystem } from './FileSystem';
import { binaryToBuffer } from './utils';
import { Service } from 'typedi';

@Service()
export class BinaryDataManager {
	private managers: {
		[key: string]: IBinaryDataManager;
	} = {};

	/**
	 * Mode for storing binary data:
	 * - `default` (in memory)
	 * - `filesystem` (on disk)
	 * - `object` (S3)
	 */
	private mode = 'default';

	private availableModes: string[] = [];

	async init(config: IBinaryDataConfig, mainManager = false) {
		this.mode = config.mode;
		this.availableModes = config.availableModes.split(',');
		this.managers = {};

		if (this.availableModes.includes('filesystem')) {
			this.managers.filesystem = new BinaryDataFileSystem(config);
			await this.managers.filesystem.init(mainManager);
		}

		return undefined;
	}

	async copyBinaryFile(binaryData: IBinaryData, filePath: string, executionId: string) {
		// If a manager handles this binary, copy over the binary file and return its reference id.
		const manager = this.managers[this.mode];
		if (manager) {
			const identifier = await manager.copyBinaryFile(filePath, executionId);
			// Add data manager reference id.
			binaryData.id = this.generateBinaryId(identifier);

			// Prevent preserving data in memory if handled by a data manager.
			binaryData.data = this.mode;

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

	async storeBinaryData(binaryData: IBinaryData, input: Buffer | Readable, executionId: string) {
		// If a manager handles this binary, return the binary data with its reference id.
		const manager = this.managers[this.mode];
		if (manager) {
			const identifier = await manager.storeBinaryData(input, executionId);

			// Add data manager reference id.
			binaryData.id = this.generateBinaryId(identifier);

			// Prevent preserving data in memory if handled by a data manager.
			binaryData.data = this.mode;

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

	getBinaryStream(identifier: string, chunkSize?: number) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].getBinaryStream(id, chunkSize);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async getBinaryDataBuffer(binaryData: IBinaryData): Promise<Buffer> {
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

	getBinaryPath(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].getBinaryPath(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async getBinaryMetadata(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].getBinaryMetadata(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async deleteBinaryDataByExecutionIds(executionIds: string[]) {
		if (this.managers[this.mode]) {
			await this.managers[this.mode].deleteBinaryDataByExecutionIds(executionIds);
		}
	}

	async duplicateBinaryData(inputData: Array<INodeExecutionData[] | null>, executionId: string) {
		if (inputData && this.managers[this.mode]) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return Promise.all(
							executionDataArray.map(async (executionData) => {
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

		return inputData as INodeExecutionData[][];
	}

	private generateBinaryId(filename: string) {
		return `${this.mode}:${filename}`;
	}

	private splitBinaryModeFileId(fileId: string): { mode: string; id: string } {
		const [mode, id] = fileId.split(':');
		return { mode, id };
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
		executionId: string,
	) {
		const binaryManager = this.managers[this.mode];

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
