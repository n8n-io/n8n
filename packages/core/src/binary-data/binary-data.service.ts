import { Container, Service } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { BINARY_ENCODING, UnexpectedError } from 'n8n-workflow';
import type { INodeExecutionData, IBinaryData } from 'n8n-workflow';
import { readFile, stat } from 'node:fs/promises';
import prettyBytes from 'pretty-bytes';
import type { Readable } from 'stream';

import { BinaryDataConfig } from './binary-data.config';
import type { BinaryData } from './types';
import { areConfigModes, binaryToBuffer } from './utils';
import { InvalidManagerError } from '../errors/invalid-manager.error';
import { InvalidModeError } from '../errors/invalid-mode.error';

@Service()
export class BinaryDataService {
	private mode: BinaryData.ServiceMode = 'default';

	private managers: Record<string, BinaryData.Manager> = {};

	constructor(private readonly config: BinaryDataConfig) {}

	async init() {
		const { config } = this;
		if (!areConfigModes(config.availableModes)) throw new InvalidModeError();

		this.mode = config.mode === 'filesystem' ? 'filesystem-v2' : config.mode;

		if (config.availableModes.includes('filesystem')) {
			const { FileSystemManager } = await import('./file-system.manager');

			this.managers.filesystem = new FileSystemManager(config.localStoragePath);
			this.managers['filesystem-v2'] = this.managers.filesystem;

			await this.managers.filesystem.init();
		}

		if (config.availableModes.includes('s3')) {
			const { ObjectStoreManager } = await import('./object-store.manager');
			const { ObjectStoreService } = await import('./object-store/object-store.service.ee');

			this.managers.s3 = new ObjectStoreManager(Container.get(ObjectStoreService));

			await this.managers.s3.init();
		}
	}

	createSignedToken(binaryData: IBinaryData, expiresIn = '1 day') {
		if (!binaryData.id) {
			throw new UnexpectedError('URL signing is not available in memory mode');
		}

		const signingPayload: BinaryData.SigningPayload = {
			id: binaryData.id,
		};

		const { signingSecret } = this.config;
		return jwt.sign(signingPayload, signingSecret, { expiresIn });
	}

	validateSignedToken(token: string) {
		const { signingSecret } = this.config;
		const signedPayload = jwt.verify(token, signingSecret) as BinaryData.SigningPayload;
		return signedPayload.id;
	}

	async copyBinaryFile(
		workflowId: string,
		executionId: string,
		binaryData: IBinaryData,
		filePath: string,
	) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const { size } = await stat(filePath);
			binaryData.fileSize = prettyBytes(size);
			binaryData.data = await readFile(filePath, { encoding: BINARY_ENCODING });

			return binaryData;
		}

		const metadata = {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
		};

		const { fileId, fileSize } = await manager.copyByFilePath(
			workflowId,
			executionId,
			filePath,
			metadata,
		);

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	async store(
		workflowId: string,
		executionId: string,
		bufferOrStream: Buffer | Readable,
		binaryData: IBinaryData,
	) {
		const manager = this.managers[this.mode];

		if (!manager) {
			const buffer = await binaryToBuffer(bufferOrStream);
			binaryData.data = buffer.toString(BINARY_ENCODING);
			binaryData.fileSize = prettyBytes(buffer.length);

			return binaryData;
		}

		const metadata = {
			fileName: binaryData.fileName,
			mimeType: binaryData.mimeType,
		};

		const { fileId, fileSize } = await manager.store(
			workflowId,
			executionId,
			bufferOrStream,
			metadata,
		);

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	async getAsStream(binaryDataId: string, chunkSize?: number) {
		const [mode, fileId] = binaryDataId.split(':');

		return await this.getManager(mode).getAsStream(fileId, chunkSize);
	}

	async getAsBuffer(binaryData: IBinaryData) {
		if (binaryData.id) {
			const [mode, fileId] = binaryData.id.split(':');

			return await this.getManager(mode).getAsBuffer(fileId);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	getPath(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');

		return this.getManager(mode).getPath(fileId);
	}

	async getMetadata(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');

		return await this.getManager(mode).getMetadata(fileId);
	}

	async deleteMany(ids: BinaryData.IdsForDeletion) {
		const manager = this.managers[this.mode];

		if (!manager) return;

		if (manager.deleteMany) await manager.deleteMany(ids);
	}

	async duplicateBinaryData(
		workflowId: string,
		executionId: string,
		inputData: Array<INodeExecutionData[] | null>,
	) {
		if (inputData && this.managers[this.mode]) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return await Promise.all(
							executionDataArray.map(async (executionData) => {
								if (executionData.binary) {
									return await this.duplicateBinaryDataInExecData(
										workflowId,
										executionId,
										executionData,
									);
								}

								return executionData;
							}),
						);
					}

					return executionDataArray;
				},
			);

			return await Promise.all(returnInputData);
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

	private createBinaryDataId(fileId: string) {
		return `${this.mode}:${fileId}`;
	}

	private async duplicateBinaryDataInExecData(
		workflowId: string,
		executionId: string,
		executionData: INodeExecutionData,
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

				return await manager?.copyByFileId(workflowId, executionId, fileId).then((newFileId) => ({
					newId: this.createBinaryDataId(newFileId),
					key,
				}));
			});

			return await Promise.all(bdPromises).then((b) => {
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

		throw new InvalidManagerError(mode);
	}
}
