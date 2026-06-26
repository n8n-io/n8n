import chunk from 'lodash/chunk';
import { jsonParse, jsonStringify } from 'n8n-workflow';

import type { ErrorReporter } from 'n8n-core';
import type { BlobStore } from './types';

const MAX_READ_CONCURRENCY = 50;

const corruptedBundleError = Symbol('corruptedBundleError');

type VersionedBundle<TPayload extends object, TVersion> = TPayload & { version: TVersion };

type BlobBundleStoreOptions<TRef, TVersion> = {
	blobStore: BlobStore;
	errorReporter: ErrorReporter;
	version: TVersion;
	key: (ref: TRef) => string;
	getId: (ref: TRef) => string;
	createWriteError: (ref: TRef, cause: unknown) => Error;
	createCorruptedError: (ref: TRef, cause: unknown) => Error;
};

export class BlobBundleStore<TRef, TPayload extends object, TVersion = 1> {
	private readonly blobStore: BlobStore;

	private readonly errorReporter: ErrorReporter;

	private readonly version: TVersion;

	private readonly key: (ref: TRef) => string;

	private readonly getId: (ref: TRef) => string;

	private readonly createWriteError: (ref: TRef, cause: unknown) => Error;

	private readonly createCorruptedError: (ref: TRef, cause: unknown) => Error;

	constructor({
		blobStore,
		errorReporter,
		version,
		key,
		getId,
		createWriteError,
		createCorruptedError,
	}: BlobBundleStoreOptions<TRef, TVersion>) {
		this.blobStore = blobStore;
		this.errorReporter = errorReporter;
		this.version = version;
		this.key = key;
		this.getId = getId;
		this.createWriteError = createWriteError;
		this.createCorruptedError = createCorruptedError;
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

	async read(ref: TRef): Promise<VersionedBundle<TPayload, TVersion> | null> {
		const content = await this.blobStore.read(this.key(ref));
		if (!content) return null;

		try {
			const bundle = jsonParse<VersionedBundle<TPayload, TVersion>>(content.toString('utf-8'));
			if (bundle.version !== this.version) {
				throw new Error(`Unsupported bundle version: ${String(bundle.version)}`);
			}
			return bundle;
		} catch (error) {
			throw this.markCorrupted(this.createCorruptedError(ref, error));
		}
	}

	async readMany(refs: TRef[]): Promise<Map<string, VersionedBundle<TPayload, TVersion>>> {
		const bundles = new Map<string, VersionedBundle<TPayload, TVersion>>();
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

	private async tryRead(ref: TRef): Promise<VersionedBundle<TPayload, TVersion> | null> {
		try {
			return await this.read(ref);
		} catch (error) {
			// Batch reads tolerate corrupted bundles, but still fail on systemic storage errors.
			if (this.isCorruptedBundleError(error)) {
				this.errorReporter.error(error);
				return null;
			}
			throw error;
		}
	}

	private markCorrupted<TError extends Error>(error: TError): TError {
		Object.defineProperty(error, corruptedBundleError, { value: true });
		return error;
	}

	private isCorruptedBundleError(error: unknown): error is Error {
		return error instanceof Error && corruptedBundleError in error;
	}
}
