import { readFile, stat } from 'fs/promises';
import concatStream from 'concat-stream';
import prettyBytes from 'pretty-bytes';
import { Service } from 'typedi';
import { BINARY_ENCODING, LoggerProxy as Logger, IBinaryData } from 'n8n-workflow';

import { FileSystemManager } from './FileSystem.manager';
import { InvalidBinaryDataManagerError, InvalidBinaryDataModeError, areValidModes } from './utils';

import type { Readable } from 'stream';
import type { BinaryData } from './types';
import type { INodeExecutionData } from 'n8n-workflow';
import { LogCatch } from '../decorators/LogCatch.decorator';

@Service()
export class BinaryDataService {
	private availableModes: BinaryData.Mode[] = [];

	private mode: BinaryData.Mode = 'default';

	private managers: Record<string, BinaryData.Manager> = {};

	async init(config: BinaryData.Config) {
		if (!areValidModes(config.availableModes)) throw new InvalidBinaryDataModeError();

		this.availableModes = config.availableModes;
		this.mode = config.mode;

		if (this.availableModes.includes('filesystem')) {
			this.managers.filesystem = new FileSystemManager(config.localStoragePath);

			await this.managers.filesystem.init();
		}
	}

	@LogCatch((error) => Logger.error('Failed to copy binary data file', { error }))
	async copyBinaryFile(binaryData: IBinaryData, path: string, executionId: string) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const { size } = await stat(path);
			binaryData.fileSize = prettyBytes(size);
			binaryData.data = await readFile(path, { encoding: BINARY_ENCODING });

			return binaryData;
		}

		const identifier = await manager.copyByPath(path, executionId);
		binaryData.id = this.createIdentifier(identifier);
		binaryData.data = this.mode; // clear binary data from memory

		const fileSize = await manager.getSize(identifier);
		binaryData.fileSize = prettyBytes(fileSize);

		await manager.storeMetadata(identifier, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
			fileSize,
		});

		return binaryData;
	}

	@LogCatch((error) => Logger.error('Failed to write binary data file', { error }))
	async store(binaryData: IBinaryData, input: Buffer | Readable, executionId: string) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const buffer = await this.binaryToBuffer(input);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);

			return binaryData;
		}

		const identifier = await manager.store(input, executionId);
		binaryData.id = this.createIdentifier(identifier);
		binaryData.data = this.mode; // clear binary data from memory

		const fileSize = await manager.getSize(identifier);
		binaryData.fileSize = prettyBytes(fileSize);

		await manager.storeMetadata(identifier, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
			fileSize,
		});

		return binaryData;
	}

	async binaryToBuffer(body: Buffer | Readable) {
		return new Promise<Buffer>((resolve) => {
			if (Buffer.isBuffer(body)) resolve(body);
			else body.pipe(concatStream(resolve));
		});
	}

	getAsStream(identifier: string, chunkSize?: number) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getManager(mode).getStream(id, chunkSize);
	}

	async getBinaryDataBuffer(binaryData: IBinaryData) {
		if (binaryData.id) return this.retrieveBinaryDataByIdentifier(binaryData.id);

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getManager(mode).getBuffer(id);
	}

	getPath(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getManager(mode).getPath(id);
	}

	async getMetadata(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getManager(mode).getMetadata(id);
	}

	async deleteManyByExecutionIds(executionIds: string[]) {
		const manager = this.getManager(this.mode);

		if (!manager) return;

		await manager.deleteManyByExecutionIds(executionIds);
	}

	@LogCatch((error) =>
		Logger.error('Failed to copy all binary data files for execution', { error }),
	)
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

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private createIdentifier(filename: string) {
		return `${this.mode}:${filename}`;
	}

	private splitBinaryModeFileId(fileId: string) {
		const [mode, id] = fileId.split(':');

		return { mode, id };
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
		executionId: string,
	) {
		const manager = this.managers[this.mode];

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

				return manager
					?.copyByIdentifier(this.splitBinaryModeFileId(binaryDataId).id, executionId)
					.then((filename) => ({
						newId: this.createIdentifier(filename),
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

	private getManager(mode: string) {
		const manager = this.managers[mode];

		if (manager) return manager;

		throw new InvalidBinaryDataManagerError(mode);
	}
}
