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

	export type FileSystemConfig = ConfigBase & { mode: 'filesystem'; localStoragePath: string };

	export type Config = InMemoryConfig | FileSystemConfig;

	export interface Client {
		init(startPurger: boolean): Promise<void>;
		getFileSize(filePath: string): Promise<number>;
		copyBinaryFile(filePath: string, executionId: string): Promise<string>;
		storeBinaryMetadata(identifier: string, metadata: BinaryMetadata): Promise<void>;
		getBinaryMetadata(identifier: string): Promise<BinaryMetadata>;
		storeBinaryData(binaryData: Buffer | Readable, executionId: string): Promise<string>;
		retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer>;
		getBinaryPath(identifier: string): string;
		getBinaryStream(identifier: string, chunkSize?: number): Readable;
		deleteBinaryDataByIdentifier(identifier: string): Promise<void>;
		duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string>;
		deleteBinaryDataByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
