import fs from 'node:fs/promises';
import { Service } from 'typedi';
import { v4 as uuid } from 'uuid';
import { toBuffer } from './utils';
import { ObjectStoreService } from '../ObjectStore/ObjectStore.service.ee';

import type { Readable } from 'node:stream';
import type { BinaryData } from './types';

@Service()
export class ObjectStoreManager implements BinaryData.Manager {
	constructor(private readonly objectStoreService: ObjectStoreService) {}

	async init() {
		await this.objectStoreService.checkConnection();
	}

	async store(
		workflowId: string,
		executionId: string,
		bufferOrStream: Buffer | Readable,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.toFileId(workflowId, executionId);
		const buffer = await this.toBuffer(bufferOrStream);

		await this.objectStoreService.put(fileId, buffer, metadata);

		return { fileId, fileSize: buffer.length };
	}

	getPath(fileId: string) {
		return fileId; // already full path, no transform needed
	}

	async getAsBuffer(fileId: string) {
		return this.objectStoreService.get(fileId, { mode: 'buffer' });
	}

	async getAsStream(fileId: string) {
		return this.objectStoreService.get(fileId, { mode: 'stream' });
	}

	async getMetadata(fileId: string): Promise<BinaryData.Metadata> {
		const {
			'content-length': contentLength,
			'content-type': contentType,
			'x-amz-meta-filename': fileName,
		} = await this.objectStoreService.getMetadata(fileId);

		const metadata: BinaryData.Metadata = { fileSize: Number(contentLength) };

		if (contentType) metadata.mimeType = contentType;
		if (fileName) metadata.fileName = fileName;

		return metadata;
	}

	async copyByFileId(workflowId: string, executionId: string, sourceFileId: string) {
		const targetFileId = this.toFileId(workflowId, executionId);

		const sourceFile = await this.objectStoreService.get(sourceFileId, { mode: 'buffer' });

		await this.objectStoreService.put(targetFileId, sourceFile);

		return targetFileId;
	}

	/**
	 * Copy to object store the temp file written by nodes like Webhook, FTP, and SSH.
	 */
	async copyByFilePath(
		workflowId: string,
		executionId: string,
		sourcePath: string,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const targetFileId = this.toFileId(workflowId, executionId);
		const sourceFile = await fs.readFile(sourcePath);

		await this.objectStoreService.put(targetFileId, sourceFile, metadata);

		return { fileId: targetFileId, fileSize: sourceFile.length };
	}

	async deleteMany(ids: BinaryData.IdsForDeletion) {
		const prefixes = ids.map(
			({ workflowId, executionId }) =>
				`workflows/${workflowId}/executions/${executionId}/binary_data/`,
		);

		await Promise.all(
			prefixes.map(async (prefix) => {
				await this.objectStoreService.deleteMany(prefix);
			}),
		);
	}

	async rename(oldFileId: string, newFileId: string) {
		const oldFile = await this.objectStoreService.get(oldFileId, { mode: 'buffer' });
		const oldFileMetadata = await this.objectStoreService.getMetadata(oldFileId);

		await this.objectStoreService.put(newFileId, oldFile, oldFileMetadata);
		await this.objectStoreService.deleteOne(oldFileId);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private toFileId(workflowId: string, executionId: string) {
		if (!executionId) executionId = 'temp'; // missing only in edge case, see PR #7244

		return `workflows/${workflowId}/executions/${executionId}/binary_data/${uuid()}`;
	}

	private async toBuffer(bufferOrStream: Buffer | Readable) {
		return toBuffer(bufferOrStream);
	}
}
