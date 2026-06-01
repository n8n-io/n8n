import type { Readable } from 'stream';

import type { BINARY_DATA_MODES } from './binary-data.config';

export namespace BinaryData {
	type LegacyMode = 'filesystem';

	type UpgradedMode = 'filesystem-v2';

	/**
	 * Binary data mode selectable by user via env var config.
	 */
	export type ConfigMode = (typeof BINARY_DATA_MODES)[number];

	/**
	 * Binary data mode used internally by binary data service. User-selected
	 * legacy modes are replaced with upgraded modes.
	 */
	export type ServiceMode = Exclude<ConfigMode, LegacyMode> | UpgradedMode;

	/**
	 * Binary data mode in binary data ID in stored execution data. Both legacy
	 * and upgraded modes may be present, except default in-memory mode.
	 */
	export type StoredMode = Exclude<ConfigMode | UpgradedMode, 'default'>;

	export type Metadata = {
		fileName?: string;
		mimeType?: string;
		fileSize: number;
	};

	export type WriteResult = { fileId: string; fileSize: number };

	export type PreWriteMetadata = Omit<Metadata, 'fileSize'>;

	export type FileLocation =
		| { type: 'execution'; workflowId: string; executionId: string }
		| { type: 'custom'; pathSegments: string[]; sourceType?: string; sourceId?: string };

	export interface Manager {
		init(): Promise<void>;

		store(
			location: FileLocation,
			bufferOrStream: Buffer | Readable,
			metadata: PreWriteMetadata,
		): Promise<WriteResult>;

		getPath(fileId: string): string;
		getAsBuffer(fileId: string): Promise<Buffer>;
		getAsStream(fileId: string, chunkSize?: number): Promise<Readable>;
		getMetadata(fileId: string): Promise<Metadata>;

		/**
		 * Present for `FileSystem`, absent for `ObjectStore` (delegated to S3 lifecycle config)
		 */
		deleteMany?(locations: FileLocation[]): Promise<void>;
		deleteManyByFileId?(ids: string[]): Promise<void>;

		copyByFileId(targetLocation: FileLocation, sourceFileId: string): Promise<string>;
		copyByFilePath(
			targetLocation: FileLocation,
			sourcePath: string,
			metadata: PreWriteMetadata,
		): Promise<WriteResult>;

		rename(oldFileId: string, newFileId: string): Promise<void>;
	}

	export type SigningPayload = {
		id: string;
	};
}
