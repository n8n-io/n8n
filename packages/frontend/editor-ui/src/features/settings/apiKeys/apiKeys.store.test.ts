import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { ApiKeyList } from '@n8n/api-types';

import * as publicApiApi from '@n8n/rest-api-client/api/api-keys';
import { useApiKeysStore } from './apiKeys.store';

vi.mock('@n8n/rest-api-client/api/api-keys', () => ({
	getApiKeys: vi.fn(),
	getApiKeyScopes: vi.fn(),
	createApiKey: vi.fn(),
	deleteApiKey: vi.fn(),
	updateApiKey: vi.fn(),
	rotateApiKey: vi.fn(),
}));

const getApiKeys = vi.mocked(publicApiApi.getApiKeys);

const owners: ApiKeyList['owners'] = [
	{ id: 'u1', firstName: 'Alice', lastName: 'A', email: 'a@e.com', keyCount: 1 },
	{ id: 'u2', firstName: 'Bob', lastName: 'B', email: 'b@e.com', keyCount: 1 },
];

const listResponse = (): ApiKeyList => ({
	items: [],
	counts: { mine: 0, all: 0 },
	totals: { mine: 0, all: 0 },
	owners,
});

describe('apiKeys.store - setOwnerFilter', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		getApiKeys.mockResolvedValue(listResponse());
	});

	const seedOwners = async () => {
		const store = useApiKeysStore();
		// Populate `owners` so the "select all == no narrowing" collapse can fire.
		await store.fetchApiKeys();
		getApiKeys.mockClear();
		return store;
	};

	it('narrows to the selected owners and resets to the first page', async () => {
		const store = await seedOwners();
		store.tableOptions.page = 3;

		await store.setOwnerFilter(['u1']);

		expect(store.ownerIds).toEqual(['u1']);
		expect(store.tableOptions.page).toBe(0);
		expect(getApiKeys).toHaveBeenCalledTimes(1);
		expect(getApiKeys).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ ownerIds: ['u1'] }),
		);
	});

	it('collapses a full selection back to null (no narrowing)', async () => {
		const store = await seedOwners();
		// Start from a narrowed state so re-selecting everyone is a real change.
		await store.setOwnerFilter(['u1']);
		getApiKeys.mockClear();

		await store.setOwnerFilter(['u1', 'u2']);

		expect(store.ownerIds).toBeNull();
		// Refetched without ownerIds, since nothing is narrowed anymore.
		expect(getApiKeys).toHaveBeenCalledTimes(1);
		expect(getApiKeys).toHaveBeenCalledWith(
			expect.anything(),
			expect.not.objectContaining({ ownerIds: expect.anything() }),
		);
	});

	it('skips a refetch when the selection is unchanged (order-independent)', async () => {
		const store = await seedOwners();
		await store.setOwnerFilter(['u1']);
		getApiKeys.mockClear();

		await store.setOwnerFilter(['u1']);

		expect(getApiKeys).not.toHaveBeenCalled();
	});

	it('resets the owner filter when switching ownership tabs', async () => {
		const store = await seedOwners();
		await store.setOwnerFilter(['u1']);
		expect(store.ownerIds).toEqual(['u1']);

		await store.setOwnership('all');

		expect(store.ownerIds).toBeNull();
	});
});
