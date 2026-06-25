import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import fs from 'node:fs/promises';
import path from 'node:path';

import { BlobBundleStore } from '../blob-storage/bundle-store';
import { FsBlobStore } from '../blob-storage/fs-blob-store';
import { EXECUTION_DATA_BUNDLE_VERSION, executionDataBundleKey } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

@Service()
export class FsStore
	extends BlobBundleStore<ExecutionRef, ExecutionDataPayload, ExecutionDataBundle>
	implements ExecutionDataStore
{
	constructor(
		blobStore: FsBlobStore,
		private readonly storageConfig: StorageConfig,
		errorReporter: ErrorReporter,
	) {
		super({
			blobStore,
			errorReporter,
			version: EXECUTION_DATA_BUNDLE_VERSION,
			key: executionDataBundleKey,
			getId: ({ executionId }) => executionId,
			createWriteError: (ref, error) => new ExecutionDataWriteError(ref, error),
			corruptedErrorClass: CorruptedExecutionDataError,
		});
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];
		if (refs.length === 0) return;

		await Promise.all(
			refs.map(
				async (r) => await fs.rm(this.resolveExecutionDir(r), { recursive: true, force: true }),
			),
		);
	}

	private resolveExecutionDir({ workflowId, executionId }: ExecutionRef) {
		return path.join(
			this.storageConfig.storagePath,
			'workflows',
			workflowId,
			'executions',
			executionId,
		);
	}
}
