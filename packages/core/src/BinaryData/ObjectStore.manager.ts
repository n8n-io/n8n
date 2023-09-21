/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Readable } from 'stream';
import type { BinaryData } from './types';

export class ObjectStoreManager implements BinaryData.Manager {
	async init() {
		throw new Error('TODO');
	}

	async store(
		workflowId: string,
		executionId: string,
		binaryData: Buffer | Readable,
		metadata: BinaryData.PreWriteMetadata,
	): Promise<BinaryData.WriteResult> {
		throw new Error('TODO');
	}

	getPath(fileId: string): string {
		throw new Error('TODO');
	}

	async getAsBuffer(fileId: string): Promise<Buffer> {
		throw new Error('TODO');
	}

	getAsStream(fileId: string, chunkSize?: number): Readable {
		throw new Error('TODO');
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
}
