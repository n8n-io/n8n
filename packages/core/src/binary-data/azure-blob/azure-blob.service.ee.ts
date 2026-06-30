import { DefaultAzureCredential } from '@azure/identity';
import type { ContainerClient } from '@azure/storage-blob';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError, UnexpectedError, UserError } from 'n8n-workflow';
import { PassThrough, Readable, pipeline } from 'node:stream';

import { AzureBlobConfig } from './azure-blob.config';
import type { BinaryData } from '../types';
import { createFixedSizeChunker } from '../utils';

@Service()
export class AzureBlobService {
	private readonly containerClient: ContainerClient;

	private isReady = false;

	constructor(
		private readonly logger: Logger,
		private readonly config: AzureBlobConfig,
	) {
		if (config.containerName === '') {
			throw new UserError(
				'Azure Blob container name not configured. Please set `N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME`.',
			);
		}
		this.containerClient = this.buildContainerClient();
	}

	private buildContainerClient(): ContainerClient {
		const { connectionString, accountName, accountKey, containerName, endpoint, authAutoDetect } =
			this.config;

		if (connectionString) {
			return BlobServiceClient.fromConnectionString(connectionString).getContainerClient(
				containerName,
			);
		}

		const url = endpoint || `https://${accountName}.blob.core.windows.net`;
		const serviceClient = authAutoDetect
			? new BlobServiceClient(url, new DefaultAzureCredential())
			: new BlobServiceClient(url, new StorageSharedKeyCredential(accountName, accountKey));

		return serviceClient.getContainerClient(containerName);
	}

	async init() {
		await this.checkConnection();
		this.isReady = true;
	}

	async checkConnection() {
		if (this.isReady) return;

		try {
			this.logger.debug('Checking connection to Azure Blob container', {
				container: this.config.containerName,
			});
			const exists = await this.containerClient.exists();
			if (!exists) {
				throw new UserError(
					`Azure Blob container "${this.config.containerName}" does not exist or is not accessible.`,
				);
			}
		} catch (e) {
			if (e instanceof UserError) throw e;
			this.handleError(e);
		}
	}

	async put(blobName: string, body: Buffer, metadata: BinaryData.PreWriteMetadata = {}) {
		try {
			await this.containerClient.getBlockBlobClient(blobName).uploadData(body, {
				blobHTTPHeaders: { blobContentType: metadata.mimeType ?? 'application/octet-stream' },
				metadata: metadata.fileName
					? { filename: encodeURIComponent(metadata.fileName) }
					: undefined,
			});
		} catch (e) {
			this.handleError(e);
		}
	}

	async get(blobName: string, opts: { mode: 'buffer' }): Promise<Buffer>;
	async get(blobName: string, opts: { mode: 'stream'; chunkSize?: number }): Promise<Readable>;
	async get(
		blobName: string,
		{ mode, chunkSize = 0 }: { mode: 'stream' | 'buffer'; chunkSize?: number },
	): Promise<Buffer | Readable> {
		const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

		try {
			if (mode === 'stream') {
				const abortController = new AbortController();
				const response = await blockBlobClient.download(0, undefined, {
					abortSignal: abortController.signal,
				});

				const body = response.readableStreamBody;
				if (!body) throw new UnexpectedError('Received empty response body');
				if (!(body instanceof Readable)) {
					throw new UnexpectedError('Expected stream but received different type', {
						extra: { bodyType: typeof body },
					});
				}

				const wrapper = new PassThrough();
				let bodyFullyConsumed = false;

				body.on('end', () => {
					bodyFullyConsumed = true;
				});

				wrapper.on('close', () => {
					if (!bodyFullyConsumed) {
						abortController.abort();
						body.destroy();
					}
				});

				body.on('error', (error) => wrapper.destroy(error));
				body.pipe(wrapper);

				if (chunkSize > 0) {
					const rechunker = createFixedSizeChunker(chunkSize);
					pipeline(wrapper, rechunker, () => {}); // propagation handled via stream events on `rechunker`
					return rechunker;
				}
				return wrapper;
			}

			return await blockBlobClient.downloadToBuffer();
		} catch (e) {
			if (e instanceof UnexpectedError) throw e;
			this.handleError(e);
		}
	}

	async getMetadata(blobName: string): Promise<BinaryData.Metadata> {
		try {
			const props = await this.containerClient.getBlockBlobClient(blobName).getProperties();

			const metadata: BinaryData.Metadata = { fileSize: props.contentLength ?? 0 };

			if (props.contentType) metadata.mimeType = props.contentType;

			const fileName = props.metadata?.filename;
			if (fileName) metadata.fileName = decodeURIComponent(fileName);

			return metadata;
		} catch (e) {
			this.handleError(e);
		}
	}

	async delete(blobName: string) {
		try {
			await this.containerClient.getBlockBlobClient(blobName).deleteIfExists();
		} catch (e) {
			this.handleError(e);
		}
	}

	private handleError(e: unknown): never {
		const error = ensureError(e);
		throw new UnexpectedError(`Request to Azure Blob storage failed: ${error.message}`, {
			cause: error,
		});
	}
}
