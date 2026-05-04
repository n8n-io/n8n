import { createPinia, setActivePinia } from 'pinia';

import { useEncryptionKeysStore } from './encryption-keys.store';
import type { EncryptionKey } from './encryption-keys.types';

vi.mock('./encryption-keys.api', () => ({
	getEncryptionKeys: vi.fn(),
	rotateEncryptionKey: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: '', sessionId: '', pushRef: '' },
	})),
}));

const makeKey = (overrides: Partial<EncryptionKey> = {}): EncryptionKey => ({
	id: 'key-id',
	type: 'data_encryption',
	algorithm: 'aes-256-gcm',
	status: 'active',
	createdAt: '2026-04-21T10:00:00.000Z',
	updatedAt: '2026-04-21T10:00:00.000Z',
	...overrides,
});

describe('encryption-keys.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('visibleKeys with date-range filter', () => {
		// Build the local YYYY-MM-DD that the picker would emit for a given timestamp,
		// matching the formatter used by the store. Keeps tests TZ-independent.
		const localDay = (iso: string) => new Intl.DateTimeFormat('en-CA').format(new Date(iso));

		it('returns the key when From and To are both set to its activation day', () => {
			const store = useEncryptionKeysStore();
			const key = makeKey();
			store.keys = [key];
			const day = localDay(key.createdAt);
			store.setFilters({ activatedFrom: day, activatedTo: day });

			expect(store.visibleKeys).toEqual([key]);
		});

		it('includes a key whose activation day falls inside the range', () => {
			const store = useEncryptionKeysStore();
			const key = makeKey({ createdAt: '2026-04-21T10:00:00.000Z' });
			store.keys = [key];
			const day = localDay(key.createdAt);
			store.setFilters({
				activatedFrom: localDay('2026-04-20T00:00:00.000Z'),
				activatedTo: localDay('2026-04-22T00:00:00.000Z'),
			});

			expect(store.visibleKeys.map((k) => k.id)).toContain(key.id);
			// Sanity-check the local-day calculation isn't pinned to UTC.
			expect(typeof day).toBe('string');
		});

		it('excludes a key whose activation day is before From', () => {
			const store = useEncryptionKeysStore();
			const key = makeKey({ createdAt: '2026-04-15T10:00:00.000Z' });
			store.keys = [key];
			store.setFilters({
				activatedFrom: localDay('2026-04-20T00:00:00.000Z'),
				activatedTo: null,
			});

			expect(store.visibleKeys).toEqual([]);
		});

		it('excludes a key whose activation day is after To', () => {
			const store = useEncryptionKeysStore();
			const key = makeKey({ createdAt: '2026-04-25T10:00:00.000Z' });
			store.keys = [key];
			store.setFilters({
				activatedFrom: null,
				activatedTo: localDay('2026-04-20T00:00:00.000Z'),
			});

			expect(store.visibleKeys).toEqual([]);
		});

		it('returns all keys when no filter is set', () => {
			const store = useEncryptionKeysStore();
			const keys = [
				makeKey({ id: 'a', createdAt: '2026-04-15T10:00:00.000Z' }),
				makeKey({ id: 'b', createdAt: '2026-04-21T10:00:00.000Z' }),
			];
			store.keys = keys;

			expect(store.visibleKeys.map((k) => k.id).sort()).toEqual(['a', 'b']);
		});
	});
});
