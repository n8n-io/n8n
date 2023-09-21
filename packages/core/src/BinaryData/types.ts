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

	export interface Manager {
		init(): Promise<void>;

		store(
			binaryData: Buffer | Readable,
			executionId: string,
			metadata: { mimeType: string; fileName?: string },
		): Promise<{ fileId: string; fileSize: number }>;

		getPath(identifier: string): string;
		getAsBuffer(identifier: string): Promise<Buffer>;
		getAsStream(identifier: string, chunkSize?: number): Readable;
		getMetadata(identifier: string): Promise<Metadata>;

		// @TODO: Refactor to also use `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		copyByFilePath(
			path: string,
			executionId: string,
			metadata: { mimeType: string; fileName?: string },
		): Promise<{ fileId: string; fileSize: number }>;

		copyByFileId(identifier: string, prefix: string): Promise<string>;

		deleteOne(identifier: string): Promise<void>;

		// @TODO: Refactor to also receive `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
