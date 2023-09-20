/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Readable } from 'stream';
import type { BinaryData } from './types';

// `/workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`

export class ObjectStoreManager implements BinaryData.Manager {
	async init() {
		throw new Error('TODO');
	}

	async store(
		workflowId: string,
		executionId: string,
		binaryData: Buffer | Readable,
		metadata: { mimeType: string; fileName?: string },
	): Promise<{ fileId: string; fileSize: number }> {
		throw new Error('TODO');
	}

	getPath(workflowId: string, fileId: string): string {
		throw new Error('TODO');
	}

	async getBuffer(workflowId: string, fileId: string): Promise<Buffer> {
		throw new Error('TODO');
	}

	getStream(workflowId: string, fileId: string, chunkSize?: number): Readable {
		throw new Error('TODO');
	}

	async getMetadata(workflowId: string, fileId: string): Promise<BinaryData.Metadata> {
		throw new Error('TODO');
	}

	async copyByFileId(workflowId: string, fileId: string, prefix: string): Promise<string> {
		throw new Error('TODO');
	}

	async copyByFilePath(
		workflowId: string,
		executionId: string,
		filePath: string,
		metadata: { mimeType: string; fileName?: string },
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
