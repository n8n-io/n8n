import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter } from 'n8n-core';
import { jsonParse, jsonStringify } from 'n8n-workflow';

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

const MAX_READ_MANY_CONCURRENCY = 50;

@Service()
export class S3Store implements ExecutionDataStore {
	constructor(
		private readonly blobStore: S3BlobStore,
		private readonly reporter: ErrorReporter,
	) {}

	async write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<number> {
		const body = Buffer.from(
			jsonStringify({ ...payload, version: EXECUTION_DATA_BUNDLE_VERSION }),
			'utf-8',
		);

		try {
			return await this.blobStore.write(this.key(ref), body, { mimeType: 'application/json' });
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

		for (const batch of chunk(refs, MAX_READ_MANY_CONCURRENCY)) {
			const bundlesInBatch = await Promise.all(batch.map(async (ref) => await this.tryRead(ref)));

			for (const [idx, bundle] of bundlesInBatch.entries()) {
				if (bundle) bundles.set(batch[idx].executionId, bundle);
			}
		}

		return bundles;
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];
		if (refs.length === 0) return;

		await this.blobStore.delete(refs.map((r) => this.key(r)));
	}

	// ----------------
	//     private
	// ----------------

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

	private async tryRead(ref: ExecutionRef) {
		try {
			return await this.read(ref);
		} catch (error) {
			if (error instanceof CorruptedExecutionDataError) {
				this.reporter.error(error);
				return null;
			}
			throw error;
		}
	}
}
