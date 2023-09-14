import { readFile, stat } from 'fs/promises';
import concatStream from 'concat-stream';
import prettyBytes from 'pretty-bytes';
import { Service } from 'typedi';
import { BINARY_ENCODING } from 'n8n-workflow';

import { FileSystemClient } from './fs.client';
import { InvalidBinaryModeError, areValidModes } from './utils';

import type { Readable } from 'stream';
import type { BinaryData } from './types';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';

@Service()
export class BinaryDataService {
	private availableModes: BinaryData.Mode[] = [];

	private mode: BinaryData.Mode = 'default';

	private clients: Record<string, BinaryData.Client> = {};

	async init(config: BinaryData.Config, mainClient = false) {
		if (!areValidModes(config.availableModes)) throw new InvalidBinaryModeError();

		this.availableModes = config.availableModes;
		this.mode = config.mode;

		if (this.availableModes.includes('filesystem') && config.mode === 'filesystem') {
			this.clients.filesystem = new FileSystemClient(config.storagePath);

			await this.clients.filesystem.init(mainClient);
		}
	}

	async copyBinaryFile(binaryData: IBinaryData, path: string, executionId: string) {
		const client = this.clients[this.mode];

		if (!client) {
			const { size } = await stat(path);
			binaryData.fileSize = prettyBytes(size);
			binaryData.data = await readFile(path, { encoding: BINARY_ENCODING });

			return binaryData;
		}

		const identifier = await client.copyByPath(path, executionId);
		binaryData.id = this.createIdentifier(identifier);
		binaryData.data = this.mode; // clear from memory

		const fileSize = await client.getSize(identifier);
		binaryData.fileSize = prettyBytes(fileSize);

		await client.storeMetadata(identifier, {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
			fileSize,
		});

		return binaryData;
	}

	async store(binaryData: IBinaryData, input: Buffer | Readable, executionId: string) {
		const client = this.clients[this.mode];

		if (!client) {
			const buffer = await this.binaryToBuffer(input);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);

			return binaryData;
		}

		const identifier = await client.store(input, executionId);
		binaryData.id = this.createIdentifier(identifier);
		binaryData.data = this.mode; // clear from memory

		const fileSize = await client.getSize(identifier);
		binaryData.fileSize = prettyBytes(fileSize);

		await client.storeMetadata(identifier, {
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

		return this.getClient(mode).getAsStream(id, chunkSize);
	}

	async getBinaryDataBuffer(binaryData: IBinaryData) {
		if (binaryData.id) return this.retrieveBinaryDataByIdentifier(binaryData.id);

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getClient(mode).getAsBuffer(id);
	}

	getPath(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getClient(mode).getPath(id);
	}

	async getMetadata(identifier: string) {
		const { mode, id } = this.splitBinaryModeFileId(identifier);

		return this.getClient(mode).getMetadata(id);
	}

	async deleteManyByExecutionIds(executionIds: string[]) {
		await this.getClient(this.mode).deleteManyByExecutionIds(executionIds);
	}

	async duplicateBinaryData(inputData: Array<INodeExecutionData[] | null>, executionId: string) {
		if (inputData && this.clients[this.mode]) {
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

	private splitBinaryModeFileId(fileId: string): { mode: string; id: string } {
		const [mode, id] = fileId.split(':');

		return { mode, id };
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
		executionId: string,
	) {
		const client = this.clients[this.mode];

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

				return client
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

	private getClient(mode: string) {
		const client = this.clients[mode];

		if (!client) throw new Error('This method is not supported by in-memory storage mode');

		return client;
	}
}
