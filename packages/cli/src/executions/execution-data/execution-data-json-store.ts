import { FsByteStore, JsonStore } from '@n8n/blob-storage';
import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';

import { EXECUTION_DATA_BUNDLE_FILENAME, EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type { ExecutionDataPayload, ExecutionRef } from './types';

@Service()
export class ExecutionDataFsByteStore extends FsByteStore {
	constructor(storageConfig: StorageConfig, errorReporter: ErrorReporter) {
		super({
			storagePath: storageConfig.storagePath,
			reportError: (error) => errorReporter.error(error),
		});
	}
}

/**
 * Stores execution data bundles as JSON blobs. The `fs` backend is always
 * available, but `s3` and `az` are registered at startup only if configured.
 */
@Service()
export class ExecutionDataJsonStore extends JsonStore<ExecutionRef, ExecutionDataPayload> {
	constructor(fsByteStore: ExecutionDataFsByteStore, errorReporter: ErrorReporter) {
		super({
			byteStores: { fs: fsByteStore },
			version: EXECUTION_DATA_BUNDLE_VERSION,
			key: ({ workflowId, executionId }) =>
				[
					'workflows',
					workflowId,
					'executions',
					executionId,
					'execution_data',
					EXECUTION_DATA_BUNDLE_FILENAME,
				].join('/'),
			getId: (ref) => ref.executionId,
			createWriteError: (ref, cause) => new ExecutionDataWriteError(ref, cause),
			createCorruptedError: (ref, cause) => new CorruptedExecutionDataError(ref, cause),
			reportError: (error) => errorReporter.error(error),
		});
	}
}
