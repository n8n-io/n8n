import { UnexpectedError } from 'n8n-workflow';

import type { ByteStore, StorageLocation } from './types';

/**
 * The byte store backing each storage location. `fs` is always present; `s3`
 * and `az` are registered at startup only when their client initialized, so a
 * configured-but-unreachable backend is absent rather than broken.
 */
export class ByteStoreRegistry {
	private readonly byteStores = new Map<StorageLocation, ByteStore>();

	constructor(byteStores: Partial<Record<StorageLocation, ByteStore>>) {
		for (const [loc, store] of Object.entries(byteStores)) {
			if (store) this.byteStores.set(loc as StorageLocation, store);
		}
	}

	register(loc: StorageLocation, store: ByteStore) {
		this.byteStores.set(loc, store);
	}

	has(loc: StorageLocation) {
		return this.byteStores.has(loc);
	}

	/** `undefined` when the location is not configured. */
	find(loc: StorageLocation) {
		return this.byteStores.get(loc);
	}

	/** Throws when the location is not configured. */
	get(loc: StorageLocation): ByteStore {
		const store = this.byteStores.get(loc);

		if (!store) {
			throw new UnexpectedError(`Byte store for location "${loc}" is not configured.`);
		}

		return store;
	}
}
