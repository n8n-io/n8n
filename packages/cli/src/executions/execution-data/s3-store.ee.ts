import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { BlobBundleStore } from '../blob-storage/bundle-store';
import { S3BlobStore } from '../blob-storage/s3-blob-store.ee';
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
export class S3Store
	extends BlobBundleStore<ExecutionRef, ExecutionDataPayload, ExecutionDataBundle>
	implements ExecutionDataStore
{
	constructor(blobStore: S3BlobStore, errorReporter: ErrorReporter) {
		super({
			blobStore,
			errorReporter,
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
			getId: ({ executionId }) => executionId,
			createWriteError: (ref, error) => new ExecutionDataWriteError(ref, error),
			createCorruptedError: (ref, error) => new CorruptedExecutionDataError(ref, error),
			corruptedErrorClass: CorruptedExecutionDataError,
		});
	}
}
