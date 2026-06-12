import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter } from 'n8n-core';
import { ObjectStoreService } from 'n8n-core/dist/binary-data/object-store/object-store.service.ee';
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

const MAX_READ_MANY_CONCURRENCY = 50;

@Service()
export class S3Store implements ExecutionDataStore {
	constructor(
		private readonly objectStore: ObjectStoreService,
		private readonly reporter: ErrorReporter,
	) {}

	async write(ref: ExecutionRef, payload: ExecutionDataPayload): Promise<number> {
		const body = Buffer.from(
			jsonStringify({ ...payload, version: EXECUTION_DATA_BUNDLE_VERSION }),
			'utf-8',
		);

		try {
			await this.objectStore.put(this.key(ref), body, {
				mimeType: 'application/json',
			});
		} catch (error) {
			throw new ExecutionDataWriteError(ref, error);
		}

		return body.length;
	}

	async read(ref: ExecutionRef) {
		let content: string;

		try {
			const buffer = await this.objectStore.get(this.key(ref), { mode: 'buffer' });
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

		await this.objectStore.deleteByKeys(refs.map((r) => this.key(r)));
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

	private isNotFound(error: unknown) {
		const original = ensureError(error).cause ?? error;
		if (typeof original !== 'object' || original === null) return false;
		const name = 'name' in original ? original.name : undefined;
		return name === 'NoSuchKey' || name === 'NotFound';
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
