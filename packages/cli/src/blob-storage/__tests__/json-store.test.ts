/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { JsonStore } from '../json-store';
import type { ByteStore, ByteStoreKey, StorageLocation } from '../types';

type TestRef = { id: string };
type TestPayload = { value: string };

class InMemoryByteStore implements ByteStore {
	readonly objects = new Map<ByteStoreKey, Buffer>();

	/** Force a non-ENOENT (systemic) failure on read for these keys. */
	readonly failingKeys = new Set<ByteStoreKey>();

	async write(key: ByteStoreKey, body: Buffer) {
		this.objects.set(key, body);
		return body.length;
	}

	async read(key: ByteStoreKey): Promise<Buffer | null> {
		if (this.failingKeys.has(key)) throw new Error('disk on fire');
		return this.objects.get(key) ?? null;
	}

	async delete(keys: ByteStoreKey[]): Promise<void> {
		for (const key of keys) this.objects.delete(key);
	}
}

const VERSION = 1;

function makeStore(byteStores: Partial<Record<StorageLocation, ByteStore>>) {
	const reportError = vi.fn();
	const store = new JsonStore<TestRef, TestPayload>({
		byteStores,
		version: VERSION,
		key: (ref) => `objects/${ref.id}.json`,
		getId: (ref) => ref.id,
		createWriteError: (ref, cause) => new Error(`write failed for ${ref.id}: ${String(cause)}`),
		createCorruptedError: (ref, cause) => new Error(`corrupt ${ref.id}: ${String(cause)}`),
		reportError,
	});
	return { store, reportError };
}

describe('JsonStore', () => {
	describe('write + read', () => {
		it('serializes with a version stamp and reads it back', async () => {
			const fs = new InMemoryByteStore();
			const { store } = makeStore({ fs });

			const bytes = await store.write({ id: 'a' }, { value: 'hello' }, 'fs');
			expect(bytes).toBeGreaterThan(0);

			const stored = JSON.parse(fs.objects.get('objects/a.json')!.toString('utf-8'));
			expect(stored).toEqual({ value: 'hello', version: VERSION });

			const bundle = await store.read({ id: 'a' }, 'fs');
			expect(bundle).toEqual({ value: 'hello', version: VERSION });
		});

		it('rejects a payload containing the reserved `version` key', async () => {
			const fs = new InMemoryByteStore();
			const { store } = makeStore({ fs });
			const payload = { value: 'x', version: 99 } as TestPayload;

			await expect(store.write({ id: 'a' }, payload, 'fs')).rejects.toThrow(
				'reserved `version` key',
			);
			expect(fs.objects.size).toBe(0);
		});

		it('returns null when the bundle is missing', async () => {
			const { store } = makeStore({ fs: new InMemoryByteStore() });
			expect(await store.read({ id: 'missing' }, 'fs')).toBeNull();
		});

		it('throws a corrupted error on unparseable bytes', async () => {
			const fs = new InMemoryByteStore();
			fs.objects.set('objects/a.json', Buffer.from('{not json', 'utf-8'));
			const { store } = makeStore({ fs });

			await expect(store.read({ id: 'a' }, 'fs')).rejects.toThrow('corrupt a');
		});

		it('throws a corrupted error on a version mismatch', async () => {
			const fs = new InMemoryByteStore();
			fs.objects.set('objects/a.json', Buffer.from(JSON.stringify({ value: 'x', version: 99 })));
			const { store } = makeStore({ fs });

			await expect(store.read({ id: 'a' }, 'fs')).rejects.toThrow('corrupt a');
		});
	});

	describe('routing', () => {
		it('writes and reads against the byte store for the given location', async () => {
			const fs = new InMemoryByteStore();
			const s3 = new InMemoryByteStore();
			const { store } = makeStore({ fs, s3 });

			await store.write({ id: 'a' }, { value: 'on-fs' }, 'fs');
			await store.write({ id: 'b' }, { value: 'on-s3' }, 's3');

			expect(fs.objects.has('objects/a.json')).toBe(true);
			expect(fs.objects.has('objects/b.json')).toBe(false);
			expect(s3.objects.has('objects/b.json')).toBe(true);
		});

		it('throws when writing to an unconfigured location', async () => {
			const { store } = makeStore({ fs: new InMemoryByteStore() });
			await expect(store.write({ id: 'a' }, { value: 'x' }, 's3')).rejects.toThrow(
				'not configured',
			);
		});

		it('uses a lazily registered byte store', async () => {
			const { store } = makeStore({ fs: new InMemoryByteStore() });
			expect(store.hasLocation('s3')).toBe(false);

			const s3 = new InMemoryByteStore();
			store.registerByteStore('s3', s3);
			expect(store.hasLocation('s3')).toBe(true);

			await store.write({ id: 'a' }, { value: 'x' }, 's3');
			expect(s3.objects.has('objects/a.json')).toBe(true);
		});
	});

	describe('readMany', () => {
		it('partitions by storedAt and returns bundles keyed by id', async () => {
			const fs = new InMemoryByteStore();
			const s3 = new InMemoryByteStore();
			const { store } = makeStore({ fs, s3 });
			await store.write({ id: 'a' }, { value: 'a' }, 'fs');
			await store.write({ id: 'b' }, { value: 'b' }, 's3');

			const bundles = await store.readMany([
				{ id: 'a', storedAt: 'fs' },
				{ id: 'b', storedAt: 's3' },
			]);

			expect(bundles.get('a')).toEqual({ value: 'a', version: VERSION });
			expect(bundles.get('b')).toEqual({ value: 'b', version: VERSION });
		});

		it('omits missing bundles without throwing', async () => {
			const fs = new InMemoryByteStore();
			const { store } = makeStore({ fs });
			await store.write({ id: 'a' }, { value: 'a' }, 'fs');

			const bundles = await store.readMany([
				{ id: 'a', storedAt: 'fs' },
				{ id: 'gone', storedAt: 'fs' },
			]);

			expect(bundles.has('a')).toBe(true);
			expect(bundles.has('gone')).toBe(false);
			expect(bundles.size).toBe(1);
		});

		it('reports and omits a corrupt bundle but keeps the rest, without throwing', async () => {
			const fs = new InMemoryByteStore();
			fs.objects.set('objects/bad.json', Buffer.from('{nope', 'utf-8'));
			const { store, reportError } = makeStore({ fs });
			await store.write({ id: 'ok' }, { value: 'ok' }, 'fs');

			const bundles = await store.readMany([
				{ id: 'ok', storedAt: 'fs' },
				{ id: 'bad', storedAt: 'fs' },
			]);

			expect(bundles.has('ok')).toBe(true);
			expect(bundles.has('bad')).toBe(false);
			expect(reportError).toHaveBeenCalledTimes(1);
		});

		it('propagates a systemic byte-store failure', async () => {
			const fs = new InMemoryByteStore();
			fs.failingKeys.add('objects/a.json');
			const { store } = makeStore({ fs });

			await expect(store.readMany([{ id: 'a', storedAt: 'fs' }])).rejects.toThrow('disk on fire');
		});
	});

	describe('delete', () => {
		it('partitions deletes by location', async () => {
			const fs = new InMemoryByteStore();
			const s3 = new InMemoryByteStore();
			const { store } = makeStore({ fs, s3 });
			await store.write({ id: 'a' }, { value: 'a' }, 'fs');
			await store.write({ id: 'b' }, { value: 'b' }, 's3');

			await store.delete([
				{ id: 'a', storedAt: 'fs' },
				{ id: 'b', storedAt: 's3' },
			]);

			expect(fs.objects.size).toBe(0);
			expect(s3.objects.size).toBe(0);
		});

		it('reports and skips deletes for an unconfigured location instead of throwing', async () => {
			const { store, reportError } = makeStore({ fs: new InMemoryByteStore() });

			await expect(store.delete([{ id: 'a', storedAt: 's3' }])).resolves.toBeUndefined();
			expect(reportError).toHaveBeenCalledTimes(1);
		});
	});
});
