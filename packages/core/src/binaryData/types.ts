import type { Readable } from 'stream';
import type { BinaryMetadata } from 'n8n-workflow';
import type { BINARY_DATA_MODES } from './utils';

export namespace BinaryData {
	export type Mode = (typeof BINARY_DATA_MODES)[number];

	type ConfigBase = {
		mode: Mode;
		availableModes: string[];
	};

	type InMemoryConfig = ConfigBase & { mode: 'default' };

	export type FileSystemConfig = ConfigBase & { mode: 'filesystem'; storagePath: string };

	export type Config = InMemoryConfig | FileSystemConfig;

	export interface Client {
		init(startPurger: boolean): Promise<void>;

		store(binaryData: Buffer | Readable, executionId: string): Promise<string>;
		getPath(identifier: string): string;
		getSize(path: string): Promise<number>; // @TODO: Refactor to use identifier?
		getAsBuffer(identifier: string): Promise<Buffer>;
		getAsStream(identifier: string, chunkSize?: number): Readable;

		storeMetadata(identifier: string, metadata: BinaryMetadata): Promise<void>;
		getMetadata(identifier: string): Promise<BinaryMetadata>;

		copyByPath(path: string, executionId: string): Promise<string>;
		copyByIdentifier(identifier: string, prefix: string): Promise<string>;

		deleteOne(identifier: string): Promise<void>;
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
