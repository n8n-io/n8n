import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { BlobBundleStore } from '../blob-storage/bundle-store';
import { FsBlobStore } from '../blob-storage/fs-blob-store';
import { EXECUTION_DATA_BUNDLE_VERSION, executionDataBundleKey } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type { ExecutionDataStore, ExecutionRef, ExecutionDataPayload } from './types';

@Service()
export class FsStore
	extends BlobBundleStore<ExecutionRef, ExecutionDataPayload>
	implements ExecutionDataStore
{
	constructor(blobStore: FsBlobStore, errorReporter: ErrorReporter) {
		super({
			blobStore,
			errorReporter,
			version: EXECUTION_DATA_BUNDLE_VERSION,
			key: executionDataBundleKey,
			getId: ({ executionId }) => executionId,
			createWriteError: (ref, error) => new ExecutionDataWriteError(ref, error),
			createCorruptedError: (ref, error) => new CorruptedExecutionDataError(ref, error),
		});
	}
}
