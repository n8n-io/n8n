import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { jsonParse, jsonStringify } from 'n8n-workflow';
import fs from 'node:fs/promises';
import path from 'node:path';

import { FsBlobStore } from '../blob-storage/fs-blob-store';
import { EXECUTION_DATA_BUNDLE_FILENAME, EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

// Max number of bundles read concurrently, to bound open file descriptors.
const MAX_READ_CONCURRENCY = 50;

@Service()
export class FsStore implements ExecutionDataStore {
	constructor(
		private readonly blobStore: FsBlobStore,
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		await this.blobStore.init?.();
	}

	async write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<number> {
		try {
			const serialized = jsonStringify({ ...payload, version: EXECUTION_DATA_BUNDLE_VERSION });
			return await this.blobStore.write(this.key(ref), Buffer.from(serialized, 'utf-8'));
		} catch (error) {
			throw new ExecutionDataWriteError(ref, error);
		}
	}

	async read(ref: ExecutionRef) {
		const content = await this.blobStore.read(this.key(ref));
		if (!content) return null;

		try {
			return jsonParse<ExecutionDataBundle>(content.toString('utf-8'));
		} catch (error) {
			throw new CorruptedExecutionDataError(ref, error);
		}
	}

	async readMany(refs: ExecutionRef[]) {
		const bundles = new Map<string, ExecutionDataBundle>();
		if (refs.length === 0) return bundles;

		// Read in chunks to cap concurrent file descriptors.
		for (const batch of chunk(refs, MAX_READ_CONCURRENCY)) {
			const bundlesInBatch = await Promise.all(batch.map(async (ref) => await this.tryRead(ref)));

			for (const [idx, bundle] of bundlesInBatch.entries()) {
				if (bundle) bundles.set(batch[idx].executionId, bundle);
			}
		}

		return bundles;
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];

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

	private key({ workflowId, executionId }: ExecutionRef) {
		return [
			'workflows',
			workflowId,
			'executions',
			executionId,
			'execution_data',
			EXECUTION_DATA_BUNDLE_FILENAME,
		].join('/');
	}

	/**
	 * Read a single bundle, tolerating per-record faults so they cannot sink a whole
	 * {@link readMany} batch. A missing bundle returns `null` ({@link read} already maps ENOENT to
	 * `null`); a corrupted (non-parseable) bundle is reported and dropped. Systemic failures
	 * (permission denied, disk read error, broken mount) are rethrown so we don't mask them.
	 */
	private async tryRead(ref: ExecutionRef): Promise<ExecutionDataBundle | null> {
		try {
			return await this.read(ref);
		} catch (error) {
			if (error instanceof CorruptedExecutionDataError) {
				this.errorReporter.error(error);
				return null;
			}
			throw error;
		}
	}
}
