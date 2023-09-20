import type { Readable } from 'stream';
import type { BINARY_DATA_MODES } from './utils';

export namespace BinaryData {
	export type Mode = (typeof BINARY_DATA_MODES)[number];

	export type Metadata = {
		fileName?: string;
		mimeType?: string;
		fileSize: number;
	};

	type ConfigBase = {
		mode: Mode;
		availableModes: string[];
	};

	type InMemoryConfig = ConfigBase & { mode: 'default' };

	export type FileSystemConfig = ConfigBase & { mode: 'filesystem'; localStoragePath: string };

	export type ObjectStoreConfig = ConfigBase & { mode: 'objectStore'; localStoragePath: string };

	export type Config = InMemoryConfig | FileSystemConfig | ObjectStoreConfig;

	export interface Manager {
		init(): Promise<void>;

		store(
			binaryData: Buffer | Readable,
			executionId: string,
			metadata: { mimeType: string; fileName?: string },
		): Promise<{ fileId: string; fileSize: number }>;

		getPath(identifier: string): string;
		getBuffer(identifier: string): Promise<Buffer>;
		getStream(identifier: string, chunkSize?: number): Readable;
		getMetadata(identifier: string): Promise<Metadata>;

		copyByFileId(identifier: string, prefix: string): Promise<string>;

		// @TODO: Refactor to also use `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		copyByFilePath(
			path: string,
			executionId: string,
			metadata: { mimeType: string; fileName?: string },
		): Promise<{ fileId: string; fileSize: number }>;

		deleteOne(identifier: string): Promise<void>;

		// @TODO: Refactor to also receive `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
