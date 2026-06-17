import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter } from 'n8n-core';
import { AzureBlobService } from 'n8n-core/dist/binary-data/azure-blob/azure-blob.service.ee';
import { ensureError, jsonParse, jsonStringify } from 'n8n-workflow';

import { EXECUTION_DATA_BUNDLE_FILENAME, EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import { CorruptedExecutionDataError } from './corrupted-execution-data.error';
import { ExecutionDataWriteError } from './execution-data-write.error';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

const MAX_READ_CONCURRENCY = 50;
const MAX_DELETE_CONCURRENCY = 50;

@Service()
export class AzureStore implements ExecutionDataStore {
	constructor(
		private readonly azureBlob: AzureBlobService,
		private readonly reporter: ErrorReporter,
	) {}

	async write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<number> {
		const body = Buffer.from(
			jsonStringify({ ...payload, version: EXECUTION_DATA_BUNDLE_VERSION }),
			'utf-8',
		);

		try {
			await this.azureBlob.put(this.key(ref), body);
		} catch (error) {
			throw new ExecutionDataWriteError(ref, error);
		}

		return body.length;
	}

	async read(ref: ExecutionRef): Promise<ExecutionDataBundle | null> {
		let content: string;

		try {
			const buffer = await this.azureBlob.get(this.key(ref));
			content = buffer.toString('utf-8');
		} catch (error) {
			if (this.isNotFound(error)) return null;
			throw error;
		}

		try {
			return jsonParse<ExecutionDataBundle>(content);
		} catch (error) {
			throw new CorruptedExecutionDataError(ref, error);
		}
	}

	async readMany(refs: ExecutionRef[]) {
		const bundles = new Map<string, ExecutionDataBundle>();
		if (refs.length === 0) return bundles;

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
		if (refs.length === 0) return;

		for (const batch of chunk(refs, MAX_DELETE_CONCURRENCY)) {
			// eslint-disable-next-line @typescript-eslint/promise-function-async
			await Promise.all(batch.map((r) => this.azureBlob.delete(this.key(r))));
		}
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

	private async tryRead(ref: ExecutionRef): Promise<ExecutionDataBundle | null> {
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

	private isNotFound(error: unknown): boolean {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const code = 'code' in original ? original.code : undefined;
		return code === 'BlobNotFound';
	}
}
