import { binaryToBuffer } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import fs from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

import { AzureBlobService } from './azure-blob/azure-blob.service.ee';
import type { BinaryData } from './types';

@Service()
export class AzureBlobManager implements BinaryData.Manager {
	constructor(private readonly azureBlobService: AzureBlobService) {}

	async init() {
		await this.azureBlobService.checkConnection();
	}

	async store(
		location: BinaryData.FileLocation,
		bufferOrStream: Buffer | Readable,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.toFileId(location);
		const buffer = await binaryToBuffer(bufferOrStream);

		await this.azureBlobService.put(fileId, buffer, metadata);

		return { fileId, fileSize: buffer.length };
	}

	getPath(fileId: string) {
		return fileId; // already full path, no transform needed
	}

	async getAsBuffer(fileId: string) {
		return await this.azureBlobService.get(fileId, { mode: 'buffer' });
	}

	async getAsStream(fileId: string, chunkSize?: number) {
		return await this.azureBlobService.get(fileId, { mode: 'stream', chunkSize });
	}

	async getMetadata(fileId: string): Promise<BinaryData.Metadata> {
		return await this.azureBlobService.getMetadata(fileId);
	}

	async copyByFileId(targetLocation: BinaryData.FileLocation, sourceFileId: string) {
		const targetFileId = this.toFileId(targetLocation);

		const sourceFile = await this.azureBlobService.get(sourceFileId, { mode: 'buffer' });
		const sourceMetadata = await this.azureBlobService.getMetadata(sourceFileId);

		await this.azureBlobService.put(targetFileId, sourceFile, sourceMetadata);

		return targetFileId;
	}

	async copyByFilePath(
		targetLocation: BinaryData.FileLocation,
		sourcePath: string,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const targetFileId = this.toFileId(targetLocation);
		const sourceFile = await fs.readFile(sourcePath);

		await this.azureBlobService.put(targetFileId, sourceFile, metadata);

		return { fileId: targetFileId, fileSize: sourceFile.length };
	}

	async rename(oldFileId: string, newFileId: string) {
		const oldFile = await this.azureBlobService.get(oldFileId, { mode: 'buffer' });
		const oldFileMetadata = await this.azureBlobService.getMetadata(oldFileId);

		await this.azureBlobService.put(newFileId, oldFile, oldFileMetadata);
		await this.azureBlobService.delete(oldFileId);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private toFileId(location: BinaryData.FileLocation) {
		switch (location.type) {
			case 'execution': {
				const executionId = location.executionId || 'temp'; // missing only in edge case, see PR #7244
				return `workflows/${location.workflowId}/executions/${executionId}/binary_data/${uuid()}`;
			}
			case 'custom':
				return `${location.pathSegments.join('/')}/binary_data/${uuid()}`;
		}
	}
}
