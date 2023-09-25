import type { Readable } from 'stream';
import type { BINARY_DATA_MODES } from './utils';

export namespace BinaryData {
	export type Mode = (typeof BINARY_DATA_MODES)[number];

	export type Config = {
		mode: 'default' | 'filesystem';
		availableModes: string[];
		localStoragePath: string;
	};

	export type Metadata = {
		fileName?: string;
		mimeType?: string;
		fileSize: number;
	};

	export type PreWriteMetadata = Omit<Metadata, 'fileSize'>;

	export interface Manager {
		init(): Promise<void>;

		store(
			binaryData: Buffer | Readable,
			executionId: string,
			preStoreMetadata: PreWriteMetadata,
		): Promise<{ fileId: string; fileSize: number }>;

		getPath(fileId: string): string;
		getAsBuffer(fileId: string): Promise<Buffer>;
		getAsStream(fileId: string, chunkSize?: number): Promise<Readable>;
		getMetadata(fileId: string): Promise<Metadata>;

		// @TODO: Refactor to also use `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		copyByFilePath(
			path: string,
			executionId: string,
			metadata: PreWriteMetadata,
		): Promise<{ fileId: string; fileSize: number }>;

		copyByFileId(fileId: string, prefix: string): Promise<string>;

		deleteOne(fileId: string): Promise<void>;

		// @TODO: Refactor to also receive `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
