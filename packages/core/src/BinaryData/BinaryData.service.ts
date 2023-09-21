import { readFile, stat } from 'fs/promises';
import concatStream from 'concat-stream';
import prettyBytes from 'pretty-bytes';
import { Service } from 'typedi';
import { BINARY_ENCODING } from 'n8n-workflow';

import { FileSystemManager } from './FileSystem.manager';
import { areValidModes } from './utils';
import { BinaryDataManagerNotFound, InvalidBinaryDataMode } from './errors';

import type { Readable } from 'stream';
import type { BinaryData } from './types';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';

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

	async store(
		binaryData: IBinaryData,
		bufferOrStream: Buffer | Readable,
		workflowId: string,
		executionId: string,
	) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const buffer = await this.binaryToBuffer(bufferOrStream);
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

	async binaryToBuffer(body: Buffer | Readable) {
		return new Promise<Buffer>((resolve) => {
			if (Buffer.isBuffer(body)) resolve(body);
			else body.pipe(concatStream(resolve));
		});
	}

	getAsStream(workflowId: string, binaryDataId: string, chunkSize?: number) {
		const [mode, uuid] = binaryDataId.split(':');

		return this.getManager(mode).getAsStream(workflowId, uuid, chunkSize);
	}

	async getBinaryDataBuffer(workflowId: string, binaryData: IBinaryData) {
		if (binaryData.id) return this.retrieveBinaryDataByIdentifier(workflowId, binaryData.id);

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async getAsBuffer(binaryData: IBinaryData) {
		if (binaryData.id) {
			const [mode, uuid] = binaryData.id.split(':');

			return this.getManager(mode).getAsBuffer(uuid);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(workflowId: string, binaryDataId: string) {
		const [mode, uuid] = binaryDataId.split(':');

		return this.getManager(mode).getAsBuffer(workflowId, uuid);
	}

	getPath(workflowId: string, binaryDataId: string) {
		const [mode, uuid] = binaryDataId.split(':');

		return this.getManager(mode).getPath(workflowId, uuid);
	}

	async getMetadata(workflowId: string, binaryDataId: string) {
		const [mode, uuid] = binaryDataId.split(':');

		return this.getManager(mode).getMetadata(workflowId, uuid);
	}

	async deleteManyByExecutionIds(executionIds: string[]) {
		await this.getManager(this.mode).deleteManyByExecutionIds(executionIds);
	}

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

				const [_mode, uuid] = binaryDataId.split(':');

				return manager?.copyByFileId(workflowId, uuid, executionId).then((newFileId) => ({
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

		throw new BinaryDataManagerNotFound(mode);
	}
}
