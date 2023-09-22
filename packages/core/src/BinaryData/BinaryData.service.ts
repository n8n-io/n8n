/* eslint-disable @typescript-eslint/naming-convention */

import { readFile, stat } from 'fs/promises';
import prettyBytes from 'pretty-bytes';
import { Service } from 'typedi';
import { BINARY_ENCODING, LoggerProxy as Logger, IBinaryData } from 'n8n-workflow';

import { areValidModes, toBuffer } from './utils';
import { UnknownBinaryDataManager, InvalidBinaryDataMode } from './errors';

import type { Readable } from 'stream';
import type { BinaryData } from './types';
import type { INodeExecutionData } from 'n8n-workflow';
import { LogCatch } from '../decorators/LogCatch.decorator';

@Service()
export class BinaryDataService {
	private mode: BinaryData.Mode = 'default';

	private managers: Record<string, BinaryData.Manager> = {};

	async init(config: BinaryData.Config) {
		if (!areValidModes(config.availableModes)) throw new InvalidBinaryDataMode();

		this.mode = config.mode;

		if (config.availableModes.includes('filesystem')) {
			const { FileSystemManager } = await import('./FileSystem.manager');
			this.managers.filesystem = new FileSystemManager(config.localStoragePath);

			await this.managers.filesystem.init();
		}

		if (config.availableModes.includes('s3')) {
			const { ObjectStoreManager } = await import('./ObjectStore.manager');
			this.managers.objectStore = new ObjectStoreManager();

			await this.managers.objectStore.init();
		}
	}

	@LogCatch((error) => Logger.error('Failed to copy binary data file', { error }))
	async copyBinaryFile(
		workflowId: string,
		binaryData: IBinaryData,
		path: string,
		executionId: string,
	) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const { size } = await stat(path);
			binaryData.fileSize = prettyBytes(size);
			binaryData.data = await readFile(path, { encoding: BINARY_ENCODING });

			return binaryData;
		}

		const { fileId, fileSize } = await manager.copyByFilePath(workflowId, executionId, path, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
		});

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	@LogCatch((error) => Logger.error('Failed to write binary data file', { error }))
	async store(
		binaryData: IBinaryData,
		bufferOrStream: Buffer | Readable,
		workflowId: string,
		executionId: string,
	) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const buffer = await this.toBuffer(bufferOrStream);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);

			return binaryData;
		}

		const { fileId, fileSize } = await manager.store(workflowId, executionId, bufferOrStream, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
		});

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	async toBuffer(bufferOrStream: Buffer | Readable) {
		return toBuffer(bufferOrStream);
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

	/**
	 * Get the path to the binary data file, e.g. `/Users/{user}/.n8n/binaryData/{uuid}`
	 * or `/workflows/{workflowId}/executions/{executionId}/binary_data/{uuid}`.
	 *
	 * Used to allow nodes to access user-written binary files (e.g. Read PDF node)
	 * and to support download of execution-written binary files.
	 */
	getPath(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');

		return this.getManager(mode).getPath(fileId);
	}

	async getMetadata(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');

		return this.getManager(mode).getMetadata(fileId);
	}

	async deleteManyByExecutionIds(ids: BinaryData.IdsForDeletion) {
		await this.getManager(this.mode).deleteMany(ids);
	}

	@LogCatch((error) =>
		Logger.error('Failed to copy all binary data files for execution', { error }),
	)
	async duplicateBinaryData(
		workflowId: string,
		inputData: Array<INodeExecutionData[] | null>,
		executionId: string,
	) {
		if (inputData && this.managers[this.mode]) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return Promise.all(
							executionDataArray.map(async (executionData) => {
								if (executionData.binary) {
									return this.duplicateBinaryDataInExecData(workflowId, executionData, executionId);
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

	/**
	 * Create an identifier `${mode}:{fileId}` for `IBinaryData['id']`.
	 */
	private createBinaryDataId(fileId: string) {
		return `${this.mode}:${fileId}`;
	}

	private async duplicateBinaryDataInExecData(
		workflowId: string,
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

				return manager?.copyByFileId(workflowId, fileId, executionId).then((newFileId) => ({
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
