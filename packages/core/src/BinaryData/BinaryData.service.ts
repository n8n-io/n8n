import { readFile, stat } from 'fs/promises';
import concatStream from 'concat-stream';
import prettyBytes from 'pretty-bytes';
import { Service } from 'typedi';
import { BINARY_ENCODING, LoggerProxy as Logger, IBinaryData } from 'n8n-workflow';

import { FileSystemManager } from './FileSystem.manager';
import { UnknownBinaryDataManager, InvalidBinaryDataMode } from './errors';
import { LogCatch } from '../decorators/LogCatch.decorator';
import { areValidModes } from './utils';

import type { Readable } from 'stream';
import type { BinaryData } from './types';
import type { INodeExecutionData } from 'n8n-workflow';

@Service()
export class BinaryDataService {
	private availableModes: BinaryData.Mode[] = [];

	private mode: BinaryData.Mode = 'default';

	private managers: Record<string, BinaryData.Manager> = {};

	async init(config: BinaryData.Config) {
		if (!areValidModes(config.availableModes)) throw new InvalidBinaryDataMode();

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

		const { fileId, fileSize } = await manager.copyByFilePath(path, executionId, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
		});

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	@LogCatch((error) => Logger.error('Failed to write binary data file', { error }))
	async store(binaryData: IBinaryData, bufferOrStream: Buffer | Readable, executionId: string) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const buffer = await this.binaryToBuffer(bufferOrStream);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);

			return binaryData;
		}

		const { fileId, fileSize } = await manager.store(bufferOrStream, executionId, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
		});

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	async binaryToBuffer(body: Buffer | Readable) {
		return new Promise<Buffer>((resolve) => {
			if (Buffer.isBuffer(body)) resolve(body);
			else body.pipe(concatStream(resolve));
		});
	}

	async getAsStream(binaryDataId: string, chunkSize?: number) {
		const [mode, fileId] = binaryDataId.split(':');

		return this.getManager(mode).getAsStream(fileId, chunkSize);
	}

	async getAsBuffer(binaryData: IBinaryData) {
		if (binaryData.id) {
			const [mode, fileId] = binaryData.id.split(':');

			return this.getManager(mode).getAsBuffer(fileId);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	getPath(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');

		return this.getManager(mode).getPath(fileId);
	}

	async getMetadata(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');

		return this.getManager(mode).getMetadata(fileId);
	}

	async deleteManyByExecutionIds(executionIds: string[]) {
		const manager = this.managers[this.mode];

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

	async rename(oldFileId: string, newFileId: string) {
		const manager = this.getManager(this.mode);

		if (!manager) return;

		await manager.rename(oldFileId, newFileId);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	/**
	 * Create an identifier `${mode}:{fileId}` for `IBinaryData['id']`.
	 */
	private createBinaryDataId(fileId: string) {
		return `${this.mode}:${fileId}`;
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

				const [_mode, fileId] = binaryDataId.split(':');

				return manager?.copyByFileId(fileId, executionId).then((newFileId) => ({
					newId: this.createBinaryDataId(newFileId),
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

		throw new UnknownBinaryDataManager(mode);
	}
}
