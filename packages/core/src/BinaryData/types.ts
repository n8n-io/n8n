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

	export type WriteResult = { fileId: string; fileSize: number };

	export interface Manager {
		init(): Promise<void>;

		store(
			workflowId: string,
			executionId: string,
			binaryData: Buffer | Readable,
			metadata: { mimeType: string; fileName?: string },
		): Promise<WriteResult>;

		getPath(workflowId: string, fileId: string): string;
		getBuffer(workflowId: string, fileId: string): Promise<Buffer>;
		getStream(workflowId: string, fileId: string, chunkSize?: number): Readable;
		getMetadata(workflowId: string, fileId: string): Promise<Metadata>;

		copyByFileId(workflowId: string, fileId: string, prefix: string): Promise<string>;
		copyByFilePath(
			workflowId: string,
			executionId: string,
			filePath: string,
			metadata: { mimeType: string; fileName?: string },
		): Promise<WriteResult>;

		deleteOne(workflowId: string, fileId: string): Promise<void>;
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
