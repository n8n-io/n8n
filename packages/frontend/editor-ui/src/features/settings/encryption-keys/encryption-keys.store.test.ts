import { createPinia, setActivePinia } from 'pinia';

import * as encryptionKeysApi from './encryption-keys.api';
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

const apiMock = vi.mocked(encryptionKeysApi.getEncryptionKeys);
const rotateMock = vi.mocked(encryptionKeysApi.rotateEncryptionKey);

const stubResponse = (items: EncryptionKey[] = [], count?: number) =>
	apiMock.mockResolvedValueOnce({ items, count: count ?? items.length });

describe('encryption-keys.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		apiMock.mockReset();
		rotateMock.mockReset();
	});

	describe('fetchKeys', () => {
		it('uses defaults: page 0, items-per-page 25, sortBy createdAt:desc, type=data_encryption', async () => {
			stubResponse([makeKey()]);
			const store = useEncryptionKeysStore();

			await store.fetchKeys();

			expect(apiMock).toHaveBeenCalledTimes(1);
			expect(apiMock.mock.calls[0][1]).toEqual({
				type: 'data_encryption',
				skip: 0,
				take: 25,
				sortBy: 'createdAt:desc',
				activatedFrom: undefined,
				activatedTo: undefined,
			});
		});

		it('populates items and totalCount from the response', async () => {
			const key = makeKey();
			stubResponse([key], 7);

			const store = useEncryptionKeysStore();
			await store.fetchKeys();

			expect(store.items).toEqual([key]);
			expect(store.totalCount).toBe(7);
		});

		it('sends skip = page * itemsPerPage', async () => {
			stubResponse();
			const store = useEncryptionKeysStore();
			store.itemsPerPage = 10;
			store.page = 3;

			await store.fetchKeys();

			expect(apiMock.mock.calls[0][1]).toMatchObject({ skip: 30, take: 10 });
		});

		it('sets isLoading during the call', async () => {
			let resolveCall!: () => void;
			apiMock.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						resolveCall = () => resolve({ items: [], count: 0 });
					}),
			);

			const store = useEncryptionKeysStore();
			const pending = store.fetchKeys();
			expect(store.isLoading).toBe(true);
			resolveCall();
			await pending;
			expect(store.isLoading).toBe(false);
		});
	});

	describe('mutations reset to page 0 and forward to the API on next fetch', () => {
		it('setSort updates sort, resets page to 0, and forwards in next fetch', async () => {
			const store = useEncryptionKeysStore();
			store.page = 4;

			store.setSort({ field: 'updatedAt', direction: 'asc' });

			expect(store.page).toBe(0);
			expect(store.sort).toEqual({ field: 'updatedAt', direction: 'asc' });

			stubResponse();
			await store.fetchKeys();

			expect(apiMock.mock.calls[0][1]).toMatchObject({ sortBy: 'updatedAt:asc' });
		});

		it('setItemsPerPage updates pagination and resets page to 0', async () => {
			const store = useEncryptionKeysStore();
			store.page = 4;

			store.setItemsPerPage(50);

			expect(store.page).toBe(0);
			expect(store.itemsPerPage).toBe(50);

			stubResponse();
			await store.fetchKeys();

			expect(apiMock.mock.calls[0][1]).toMatchObject({ skip: 0, take: 50 });
		});

		it('setFilters updates filters, resets page, and forwards in next fetch', async () => {
			const store = useEncryptionKeysStore();
			store.page = 2;

			store.setFilters({
				activatedFrom: '2026-04-01T00:00:00.000Z',
				activatedTo: '2026-04-30T23:59:59.999Z',
			});

			expect(store.page).toBe(0);

			stubResponse();
			await store.fetchKeys();

			expect(apiMock.mock.calls[0][1]).toMatchObject({
				activatedFrom: '2026-04-01T00:00:00.000Z',
				activatedTo: '2026-04-30T23:59:59.999Z',
			});
		});

		it('resetFilters clears filters and resets page', async () => {
			const store = useEncryptionKeysStore();
			store.filters = {
				activatedFrom: '2026-04-01T00:00:00.000Z',
				activatedTo: '2026-04-30T23:59:59.999Z',
			};
			store.page = 2;

			store.resetFilters();

			expect(store.page).toBe(0);
			expect(store.filters).toEqual({ activatedFrom: null, activatedTo: null });

			stubResponse();
			await store.fetchKeys();

			expect(apiMock.mock.calls[0][1]).toMatchObject({
				activatedFrom: undefined,
				activatedTo: undefined,
			});
		});

		it('setPage does NOT reset other state', () => {
			const store = useEncryptionKeysStore();
			store.itemsPerPage = 50;
			store.sort = { field: 'updatedAt', direction: 'asc' };

			store.setPage(7);

			expect(store.page).toBe(7);
			expect(store.itemsPerPage).toBe(50);
			expect(store.sort).toEqual({ field: 'updatedAt', direction: 'asc' });
		});
	});

	describe('rotateKey', () => {
		it('calls API, resets to page 0 and createdAt:desc, then refetches', async () => {
			rotateMock.mockResolvedValueOnce(makeKey());
			const fetchedKey = makeKey({ id: 'fresh' });
			stubResponse([fetchedKey], 1);

			const store = useEncryptionKeysStore();
			store.page = 4;
			store.sort = { field: 'updatedAt', direction: 'asc' };

			await store.rotateKey();

			expect(rotateMock).toHaveBeenCalledTimes(1);
			expect(store.page).toBe(0);
			expect(store.sort).toEqual({ field: 'createdAt', direction: 'desc' });
			expect(apiMock).toHaveBeenCalledTimes(1);
			expect(apiMock.mock.calls[0][1]).toMatchObject({
				skip: 0,
				sortBy: 'createdAt:desc',
			});
			expect(store.items).toEqual([fetchedKey]);
			expect(store.totalCount).toBe(1);
		});

		it('toggles isRotating during the call', async () => {
			let resolveRotate!: (value: EncryptionKey) => void;
			rotateMock.mockImplementationOnce(
				async () =>
					await new Promise<EncryptionKey>((resolve) => {
						resolveRotate = resolve;
					}),
			);
			stubResponse();

			const store = useEncryptionKeysStore();
			const pending = store.rotateKey();
			expect(store.isRotating).toBe(true);
			resolveRotate(makeKey());
			await pending;
			expect(store.isRotating).toBe(false);
		});
	});

	describe('isEmpty', () => {
		it('is true when no items and no filters', () => {
			const store = useEncryptionKeysStore();
			expect(store.isEmpty).toBe(true);
		});

		it('is false when filters are active even if there are no items', () => {
			const store = useEncryptionKeysStore();
			store.filters = { activatedFrom: '2026-04-01T00:00:00.000Z', activatedTo: null };
			expect(store.isEmpty).toBe(false);
		});

		it('is false when there are items', () => {
			const store = useEncryptionKeysStore();
			store.items = [makeKey()];
			store.totalCount = 1;
			expect(store.isEmpty).toBe(false);
		});
	});

	describe('activeKey', () => {
		it('returns the key with status=active', () => {
			const store = useEncryptionKeysStore();
			const active = makeKey({ id: 'a', status: 'active' });
			store.items = [makeKey({ id: 'b', status: 'inactive' }), active];
			expect(store.activeKey).toEqual(active);
		});

		it('returns null when no active key is present', () => {
			const store = useEncryptionKeysStore();
			store.items = [makeKey({ status: 'inactive' })];
			expect(store.activeKey).toBeNull();
		});
	});
});
