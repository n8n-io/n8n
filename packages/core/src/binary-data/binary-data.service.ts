import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import jwt from 'jsonwebtoken';
import type { StringValue as TimeUnitValue } from 'ms';
import { BINARY_ENCODING, UnexpectedError } from 'n8n-workflow';
import type { INodeExecutionData, IBinaryData } from 'n8n-workflow';
import { readFile, stat } from 'node:fs/promises';
import prettyBytes from 'pretty-bytes';
import type { Readable } from 'stream';

import { ErrorReporter } from '@/errors';

import { BinaryDataConfig } from './binary-data.config';
import type { BinaryData } from './types';
import { binaryToBuffer } from './utils';
import { InvalidManagerError } from '../errors/invalid-manager.error';

@Service()
export class BinaryDataService {
	private mode: BinaryData.ServiceMode = 'filesystem-v2';

	private managers: Record<string, BinaryData.Manager> = {};

	private managerLoaders: Record<string, BinaryData.ManagerLoader> = {};

	private loadingPromises: Map<string, Promise<BinaryData.Manager>> = new Map();

	constructor(
		private readonly config: BinaryDataConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly logger: Logger,
	) {}

	setManager(mode: BinaryData.ServiceMode, manager: BinaryData.Manager) {
		this.managers[mode] = manager;
	}

	registerLoader(mode: string, loader: BinaryData.ManagerLoader) {
		this.managerLoaders[mode] = loader;
	}

	async init() {
		const { config } = this;

		this.mode = config.mode === 'filesystem' ? 'filesystem-v2' : config.mode;

		this.registerLoader('filesystem', async () => {
			const { FileSystemManager } = await import('./file-system.manager');
			return new FileSystemManager(config.localStoragePath, this.errorReporter);
		});

		// Eagerly load only the configured write mode (filesystem-v2)
		if (this.mode === 'filesystem-v2') {
			const loader = this.managerLoaders['filesystem'];
			if (loader) {
				await this.loadManager('filesystem', loader);
			}
		}

		// DB and S3 loaders will be registered from cli package
	}

	createSignedToken(binaryData: IBinaryData, expiresIn: TimeUnitValue = '1 day') {
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
		location: BinaryData.FileLocation,
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

		const { fileId, fileSize } = await manager.copyByFilePath(location, filePath, metadata);

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	async store(
		location: BinaryData.FileLocation,
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

		const { fileId, fileSize } = await manager.store(location, bufferOrStream, metadata);

		binaryData.id = this.createBinaryDataId(fileId);
		binaryData.fileSize = prettyBytes(fileSize);
		binaryData.data = this.mode; // clear binary data from memory

		return binaryData;
	}

	async getAsStream(binaryDataId: string, chunkSize?: number) {
		const [mode, fileId] = binaryDataId.split(':');
		const manager = await this.getManager(mode);

		return await manager.getAsStream(fileId, chunkSize);
	}

	async getAsBuffer(binaryData: IBinaryData) {
		if (binaryData.id) {
			const [mode, fileId] = binaryData.id.split(':');
			const manager = await this.getManager(mode);

			return await manager.getAsBuffer(fileId);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async getPath(binaryDataId: string): Promise<string> {
		const [mode, fileId] = binaryDataId.split(':');
		const manager = await this.getManager(mode);

		return manager.getPath(fileId);
	}

	async getMetadata(binaryDataId: string) {
		const [mode, fileId] = binaryDataId.split(':');
		const manager = await this.getManager(mode);

		return await manager.getMetadata(fileId);
	}

	async deleteMany(locations: BinaryData.FileLocation[]) {
		const manager = this.managers[this.mode];

		if (!manager) return;

		if (manager.deleteMany) await manager.deleteMany(locations);
	}

	async deleteManyByBinaryDataId(ids: string[]) {
		const fileIdsByMode = new Map<string, string[]>();

		for (const attachmentId of ids) {
			const [mode, fileId] = attachmentId.split(':');

			if (!fileId) {
				continue;
			}

			const entry = fileIdsByMode.get(mode) ?? [];

			fileIdsByMode.set(mode, entry.concat([fileId]));
		}

		for (const [mode, fileIds] of fileIdsByMode) {
			const manager = this.managers[mode];

			if (!manager) {
				this.logger.info(
					`File manager of mode ${mode} is missing. Skip deleting these files: ${fileIds.join(', ')}`,
				);
				continue;
			}

			await manager.deleteManyByFileId?.(fileIds);
		}
	}

	async duplicateBinaryData(
		location: BinaryData.FileLocation,
		inputData: Array<INodeExecutionData[] | null>,
	) {
		if (inputData && this.managers[this.mode]) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return await Promise.all(
							executionDataArray.map(async (executionData) => {
								if (executionData.binary) {
									return await this.duplicateBinaryDataInExecData(location, executionData);
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
		const manager = await this.getManager(this.mode);

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
		location: BinaryData.FileLocation,
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

				return await manager?.copyByFileId(location, fileId).then((newFileId) => ({
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

	async getManager(mode: string): Promise<BinaryData.Manager> {
		if (this.managers[mode]) return this.managers[mode];

		const loadingPromise = this.loadingPromises.get(mode);
		if (loadingPromise) return await loadingPromise;

		const loader = this.managerLoaders[mode];
		if (!loader) {
			throw new InvalidManagerError(mode);
		}

		const promise = this.loadManager(mode, loader);
		this.loadingPromises.set(mode, promise);

		try {
			const manager = await promise;
			return manager;
		} finally {
			this.loadingPromises.delete(mode);
		}
	}

	private async loadManager(
		mode: string,
		loader: BinaryData.ManagerLoader,
	): Promise<BinaryData.Manager> {
		try {
			this.logger.debug(`Lazy-loading binary data manager for mode: ${mode}`);
			const manager = await loader();
			await manager.init();
			this.managers[mode] = manager;

			// Handle filesystem-v2 alias
			if (mode === 'filesystem') {
				this.managers['filesystem-v2'] = manager;
			}

			this.logger.debug(`Successfully loaded binary data manager for mode: ${mode}`);
			return manager;
		} catch (error) {
			this.logger.warn(`Failed to load binary data manager for mode ${mode}`, { error });
			throw error;
		}
	}
}
