import chunk from 'lodash/chunk';
import { jsonParse, jsonStringify } from 'n8n-workflow';

import type { ErrorReporter } from 'n8n-core';
import type { BlobStore } from './types';

const MAX_READ_CONCURRENCY = 50;

type CorruptedErrorClass<TRef> = new (ref: TRef, cause: unknown) => Error;

type BlobBundleStoreOptions<
	TRef,
	TPayload extends object,
	TBundle extends TPayload & { version: unknown },
> = {
	blobStore: BlobStore;
	errorReporter: ErrorReporter;
	version: TBundle['version'];
	key: (ref: TRef) => string;
	getId: (ref: TRef) => string;
	createWriteError: (ref: TRef, cause: unknown) => Error;
	corruptedErrorClass: CorruptedErrorClass<TRef>;
};

export class BlobBundleStore<
	TRef,
	TPayload extends object,
	TBundle extends TPayload & { version: unknown },
> {
	private readonly blobStore: BlobStore;

	private readonly errorReporter: ErrorReporter;

	private readonly version: TBundle['version'];

	private readonly key: (ref: TRef) => string;

	private readonly getId: (ref: TRef) => string;

	private readonly createWriteError: (ref: TRef, cause: unknown) => Error;

	private readonly corruptedErrorClass: CorruptedErrorClass<TRef>;

	constructor({
		blobStore,
		errorReporter,
		version,
		key,
		getId,
		createWriteError,
		corruptedErrorClass,
	}: BlobBundleStoreOptions<TRef, TPayload, TBundle>) {
		this.blobStore = blobStore;
		this.errorReporter = errorReporter;
		this.version = version;
		this.key = key;
		this.getId = getId;
		this.createWriteError = createWriteError;
		this.corruptedErrorClass = corruptedErrorClass;
	}

	async init() {
		await this.blobStore.init?.();
	}

	async write(ref: TRef, payload: TPayload): Promise<number> {
		try {
			const serialized = jsonStringify({ ...payload, version: this.version });
			return await this.blobStore.write(this.key(ref), Buffer.from(serialized, 'utf-8'), {
				mimeType: 'application/json',
			});
		} catch (error) {
			throw this.createWriteError(ref, error);
		}
	}

	async read(ref: TRef): Promise<TBundle | null> {
		const content = await this.blobStore.read(this.key(ref));
		if (!content) return null;

		try {
			const bundle = jsonParse<TBundle>(content.toString('utf-8'));
			if (bundle.version !== this.version) {
				throw new Error(`Unsupported bundle version: ${String(bundle.version)}`);
			}
			return bundle;
		} catch (error) {
			throw new this.corruptedErrorClass(ref, error);
		}
	}

	async readMany(refs: TRef[]): Promise<Map<string, TBundle>> {
		const bundles = new Map<string, TBundle>();
		if (refs.length === 0) return bundles;

		for (const batch of chunk(refs, MAX_READ_CONCURRENCY)) {
			const bundlesInBatch = await Promise.all(batch.map(async (ref) => await this.tryRead(ref)));

			for (const [idx, bundle] of bundlesInBatch.entries()) {
				if (bundle) bundles.set(this.getId(batch[idx]), bundle);
			}
		}

		return bundles;
	}

	async delete(ref: TRef | TRef[]): Promise<void> {
		const refs = Array.isArray(ref) ? ref : [ref];
		if (refs.length === 0) return;

		const keys = refs.map((r) => this.key(r));
		await this.blobStore.delete(keys);
	}

	private async tryRead(ref: TRef): Promise<TBundle | null> {
		try {
			return await this.read(ref);
		} catch (error) {
			// Batch reads tolerate corrupted bundles, but still fail on systemic storage errors.
			if (error instanceof this.corruptedErrorClass) {
				this.errorReporter.error(error);
				return null;
			}
			throw error;
		}
	}
}
