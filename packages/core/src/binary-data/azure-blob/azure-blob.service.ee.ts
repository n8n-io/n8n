import { DefaultAzureCredential } from '@azure/identity';
import type { ContainerClient } from '@azure/storage-blob';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError, UnexpectedError, UserError } from 'n8n-workflow';

import { AzureBlobConfig } from './azure-blob.config';

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

	async put(blobName: string, body: Buffer) {
		try {
			await this.containerClient.getBlockBlobClient(blobName).uploadData(body, {
				blobHTTPHeaders: { blobContentType: 'application/json' },
			});
		} catch (e) {
			this.handleError(e);
		}
	}

	async get(blobName: string): Promise<Buffer> {
		try {
			return await this.containerClient.getBlockBlobClient(blobName).downloadToBuffer();
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
