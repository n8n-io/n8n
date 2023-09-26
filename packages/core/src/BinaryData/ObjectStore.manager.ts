import Container, { Service } from 'typedi';
import { v4 as uuid } from 'uuid';
import { FileSystemManager } from './FileSystem.manager';
import { toBuffer } from './utils';
import { ObjectStoreService } from '../ObjectStore/ObjectStore.service.ee';

import type { Readable } from 'node:stream';
import type { BinaryData } from './types';

@Service()
export class ObjectStoreManager implements BinaryData.Manager {
	private readonly objectStoreService: ObjectStoreService;

	constructor() {
		this.objectStoreService = Container.get(ObjectStoreService); // @TODO: Inject
	}

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
		return fileId; // already full path
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
	 * Create a copy of a file in the filesystem. Used by Webhook, FTP, SSH nodes.
	 *
	 * This delegates to FS manager because the object store manager does not support
	 * storage and access of user-written data, only execution-written data.
	 */
	async copyByFilePath(
		workflowId: string,
		executionId: string,
		filePath: string,
		metadata: BinaryData.PreWriteMetadata,
	) {
		return Container.get(FileSystemManager).copyByFilePath(
			workflowId,
			executionId,
			filePath,
			metadata,
		);
	}

	async deleteOne(fileId: string) {
		await this.objectStoreService.deleteOne(fileId);
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

		await this.objectStoreService.put(newFileId, oldFile);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private toFileId(workflowId: string, executionId: string) {
		return `workflows/${workflowId}/executions/${executionId}/binary_data/${uuid()}`;
	}

	private async toBuffer(bufferOrStream: Buffer | Readable) {
		return toBuffer(bufferOrStream);
	}
}
