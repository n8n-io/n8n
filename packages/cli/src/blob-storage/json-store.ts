import chunk from 'lodash/chunk';
import { jsonParse, jsonStringify, UnexpectedError } from 'n8n-workflow';

import { SkippedEntryDeletionError } from './skipped-entry-deletion.error';
import type { ByteStore, JsonEntry, JsonStoreOptions, StorageLocation, Stored } from './types';

const CORRUPT_ENTRY = Symbol('corruptEntry');

const MAX_READ_CONCURRENCY = 50;

/** Stores JSON entries as blobs using pluggable backends. */
export class JsonStore<Ref, Payload extends object> {
	private readonly byteStores = new Map<StorageLocation, ByteStore>();

	constructor(private readonly options: JsonStoreOptions<Ref>) {
		for (const [loc, store] of Object.entries(options.byteStores)) {
			if (store) this.byteStores.set(loc as StorageLocation, store);
		}
	}

	registerByteStore(loc: StorageLocation, store: ByteStore) {
		this.byteStores.set(loc, store);
	}

	hasLocation(loc: StorageLocation) {
		return this.byteStores.has(loc);
	}

	async write(ref: Ref, payload: Payload, loc: StorageLocation) {
		const store = this.getByteStore(loc);
		try {
			const body = Buffer.from(
				jsonStringify({ ...payload, version: this.options.version }),
				'utf-8',
			);
			return await store.write(this.options.key(ref), body, 'application/json');
		} catch (error) {
			throw this.options.createWriteError(ref, error);
		}
	}

	async read(ref: Ref, loc: StorageLocation) {
		const store = this.getByteStore(loc);
		const key = this.options.key(ref);
		const bytes = await store.read(key);
		if (!bytes) return null;
		return this.parse(ref, bytes);
	}

	async readMany(refs: Array<Stored<Ref>>) {
		const entries = new Map<string, JsonEntry<Payload>>();
		if (refs.length === 0) return entries;

		await Promise.all(
			[...this.groupByLocation(refs)].map(async ([loc, group]) => {
				const store = this.getByteStore(loc);
				for (const batch of chunk(group, MAX_READ_CONCURRENCY)) {
					const results = await Promise.all(
						batch.map(async (ref) => await this.tryRead(ref, store)),
					);
					results.forEach((entry, idx) => {
						if (entry) entries.set(this.options.getId(batch[idx]), entry);
					});
				}
			}),
		);

		return entries;
	}

	async delete(refs: Array<Stored<Ref>>) {
		if (refs.length === 0) return;

		await Promise.all(
			[...this.groupByLocation(refs)].map(async ([loc, group]) => {
				const store = this.byteStores.get(loc);
				if (!store) {
					this.options.reportError(new SkippedEntryDeletionError(loc, group.length));
					return;
				}
				await store.delete(group.map((ref) => this.options.key(ref)));
			}),
		);
	}

	// private methods

	private groupByLocation(refs: Array<Stored<Ref>>) {
		const groups = new Map<StorageLocation, Ref[]>();
		for (const ref of refs) {
			const group = groups.get(ref.storedAt) ?? [];
			group.push(ref);
			groups.set(ref.storedAt, group);
		}
		return groups;
	}

	private async tryRead(ref: Ref, store: ByteStore) {
		try {
			const bytes = await store.read(this.options.key(ref));
			if (!bytes) return null;
			return this.parse(ref, bytes);
		} catch (error) {
			if (this.isCorruptEntryError(error)) {
				this.options.reportError(error);
				return null;
			}
			throw error;
		}
	}

	private parse(ref: Ref, bytes: Buffer) {
		try {
			const entry = jsonParse<JsonEntry<Payload>>(bytes.toString('utf-8'));
			if (entry.version !== this.options.version) {
				throw new Error(`Unsupported entry version: ${String(entry.version)}`);
			}
			return entry;
		} catch (error) {
			throw this.markCorrupt(this.options.createCorruptedError(ref, error));
		}
	}

	private getByteStore(loc: StorageLocation): ByteStore {
		const store = this.byteStores.get(loc);
		if (!store) {
			throw new UnexpectedError(`JSON store for location "${loc}" is not configured.`);
		}
		return store;
	}

	private markCorrupt<E extends Error>(error: E): E {
		Object.defineProperty(error, CORRUPT_ENTRY, { value: true });
		return error;
	}

	private isCorruptEntryError(error: unknown): error is Error {
		return error instanceof Error && CORRUPT_ENTRY in error;
	}
}
