import type { Readable } from 'stream';
import type { BinaryMetadata } from 'n8n-workflow';

export namespace BinaryData {
	/**
	 * Mode for storing binary data:
	 * - `default` (in memory)
	 * - `filesystem` (on disk)
	 * - `object` (S3)
	 */
	export type Mode = 'default' | 'filesystem' | 'object';

	type ConfigBase = {
		mode: Mode;
		availableModes: string; // comma-separated list
	};

	type InMemoryConfig = ConfigBase & { mode: 'default' };

	export type FileSystemConfig = ConfigBase & { mode: 'filesystem'; storagePath: string };

	export type Config = InMemoryConfig | FileSystemConfig;

	export interface Client {
		init(startPurger: boolean): Promise<void>;

		store(binaryData: Buffer | Readable, executionId: string): Promise<string>;
		getPath(identifier: string): string;
		getSize(path: string): Promise<number>;

		storeMetadata(identifier: string, metadata: BinaryMetadata): Promise<void>;
		getMetadata(identifier: string): Promise<BinaryMetadata>;

		toBuffer(identifier: string): Promise<Buffer>;
		toStream(identifier: string, chunkSize?: number): Readable;

		copyByPath(path: string, executionId: string): Promise<string>;
		copyByIdentifier(identifier: string, prefix: string): Promise<string>;

		deleteOne(identifier: string): Promise<void>;
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
