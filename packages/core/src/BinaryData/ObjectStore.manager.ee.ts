/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Readable } from 'stream';
import type { BinaryData } from './types';

export class ObjectStoreManager implements BinaryData.Manager {
	async init() {
		throw new Error('TODO');
	}

	async store(
		binaryData: Buffer | Readable,
		executionId: string,
		metadata: { mimeType: string; fileName?: string },
	): Promise<{ fileId: string; fileSize: number }> {
		throw new Error('TODO');
	}

	getPath(identifier: string): string {
		throw new Error('TODO');
	}

	async getBuffer(identifier: string): Promise<Buffer> {
		throw new Error('TODO');
	}

	getStream(identifier: string, chunkSize?: number): Readable {
		throw new Error('TODO');
	}

	async getMetadata(identifier: string): Promise<BinaryData.Metadata> {
		throw new Error('TODO');
	}

	async copyByFileId(fileId: string, executionId: string): Promise<string> {
		throw new Error('TODO');
	}

	async copyByFilePath(
		path: string,
		executionId: string,
	): Promise<{ fileId: string; fileSize: number }> {
		throw new Error('TODO');
	}

	async deleteOne(fileId: string): Promise<void> {
		throw new Error('TODO');
	}

	async deleteManyByExecutionIds(executionIds: string[]): Promise<string[]> {
		throw new Error('TODO');
	}
}
