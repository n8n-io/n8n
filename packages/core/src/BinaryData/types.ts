import type { Readable } from 'stream';
import type { BinaryMetadata } from 'n8n-workflow';
import type { BINARY_DATA_MODES } from './utils';

export namespace BinaryData {
	export type Mode = (typeof BINARY_DATA_MODES)[number];

	export type Config = {
		mode: 'default' | 'filesystem';
		availableModes: string[];
		localStoragePath: string;
	};

	export interface Manager {
		init(): Promise<void>;

		store(binaryData: Buffer | Readable, executionId: string): Promise<string>;
		getPath(identifier: string): string;

		// @TODO: Refactor to use identifier
		getSize(path: string): Promise<number>;

		getBuffer(identifier: string): Promise<Buffer>;
		getStream(identifier: string, chunkSize?: number): Readable;

		// @TODO: Refactor out - not needed for object storage
		storeMetadata(identifier: string, metadata: BinaryMetadata): Promise<void>;

		// @TODO: Refactor out - not needed for object storage
		getMetadata(identifier: string): Promise<BinaryMetadata>;

		// @TODO: Refactor to also use `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		copyByPath(path: string, executionId: string): Promise<string>;

		copyByIdentifier(identifier: string, prefix: string): Promise<string>;

		deleteOne(identifier: string): Promise<void>;

		// @TODO: Refactor to also receive `workflowId` to support full path-like identifier:
		// `workflows/{workflowId}/executions/{executionId}/binary_data/{fileId}`
		deleteManyByExecutionIds(executionIds: string[]): Promise<string[]>;
	}
}
