import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { jsonParse, jsonStringify } from 'n8n-workflow';
import path from 'node:path';

import { JsonFileStore } from '@/storage/json-file-store';

import { EXECUTION_DATA_BUNDLE_FILENAME, EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

@Service()
export class FsStore implements ExecutionDataStore {
	private readonly store: JsonFileStore<ExecutionRef, ExecutionDataPayload, ExecutionDataBundle>;

	constructor(
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
	) {
		this.store = new JsonFileStore({
			storagePath: this.storageConfig.storagePath,
			resolveFileDir: (ref) => path.join(this.resolveExecutionDir(ref), 'execution_data'),
			resolveDeleteDir: (ref) => this.resolveExecutionDir(ref),
			filename: EXECUTION_DATA_BUNDLE_FILENAME,
			serialize: (payload) => jsonStringify({ ...payload, version: EXECUTION_DATA_BUNDLE_VERSION }),
			parse: (content) => jsonParse<ExecutionDataBundle>(content),
			key: (ref) => ref.executionId,
			wrapWriteError: (ref, error) => new ExecutionDataWriteError(ref, error),
			wrapParseError: (ref, error) => new CorruptedExecutionDataError(ref, error),
			shouldDropReadManyError: (error) => error instanceof CorruptedExecutionDataError,
			reportError: (error) => this.errorReporter.error(error),
		});
	}

	async init() {
		await this.store.init();
	}

	async write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<number> {
		return await this.store.write(ref, payload);
	}

	async read(ref: ExecutionRef) {
		return await this.store.read(ref);
	}

	async readMany(refs: ExecutionRef[]) {
		return await this.store.readMany(refs);
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		await this.store.delete(ref);
	}

	private resolveExecutionDir({ workflowId, executionId }: ExecutionRef) {
		return path.join('workflows', workflowId, 'executions', executionId);
	}
}
