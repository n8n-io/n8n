/* eslint-disable @typescript-eslint/no-unused-vars */

import { Service } from 'typedi';
import { v4 as uuid } from 'uuid';
import type { ObjectStoreService } from '@/ObjectStore/ObjectStore.service.ee';

import type { Readable } from 'stream';
import type { BinaryData } from './types';
import concatStream from 'concat-stream';

@Service()
export class ObjectStoreManager implements BinaryData.Manager {
	constructor(private objectStoreService: ObjectStoreService) {}

	async init() {
		await this.objectStoreService.checkConnection();
	}

	async store(
		workflowId: string,
		executionId: string,
		bufferOrStream: Buffer | Readable,
		_metadata: BinaryData.PreWriteMetadata, // @TODO: Use metadata
	) {
		const fileId = `/workflows/${workflowId}/executions/${executionId}/binary_data/${uuid()}`;
		const buffer = await this.binaryToBuffer(bufferOrStream);

		await this.objectStoreService.put(fileId, buffer);

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
		throw new Error('TODO');
	}

	async copyByFileId(workflowId: string, fileId: string, executionId: string): Promise<string> {
		throw new Error('TODO');
	}

	async copyByFilePath(
		workflowId: string,
		executionId: string,
		path: string,
		metadata: BinaryData.PreWriteMetadata,
	): Promise<BinaryData.WriteResult> {
		throw new Error('TODO');
	}

	async deleteOne(fileId: string): Promise<void> {
		throw new Error('TODO');
	}

	async deleteManyByExecutionIds(executionIds: string[]): Promise<string[]> {
		throw new Error('TODO');
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	// @TODO: Duplicated from BinaryData service
	private async binaryToBuffer(body: Buffer | Readable) {
		return new Promise<Buffer>((resolve) => {
			if (Buffer.isBuffer(body)) resolve(body);
			else body.pipe(concatStream(resolve));
		});
	}
}
