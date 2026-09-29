import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useAnnotationTagsStore, useTagsStore } from './tags.store';
import { mockedStore } from '@/__tests__/utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import { shallowRef } from 'vue';

const { hasPermission, mockApi } = vi.hoisted(() => ({
	hasPermission: vi.fn(() => true),
	mockApi: {
		getTags: vi.fn(),
		createTag: vi.fn(),
		updateTag: vi.fn(),
		deleteTag: vi.fn(),
	},
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => shallowRef({ removeTag: vi.fn() }),
}));

vi.mock('./tags.api', () => ({
	createTagsApi: () => mockApi,
}));

const mockTag: ITag = { id: '1', name: 'test-tag', usageCount: 0, createdAt: '', updatedAt: '' };

describe.each([
	['useTagsStore', useTagsStore],
	['useAnnotationTagsStore', useAnnotationTagsStore],
])('%s — fetchAll loading state', (_, useStore) => {
	let tagsStore: ReturnType<typeof useTagsStore>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		vi.clearAllMocks();
		mockApi.getTags.mockReset();
		hasPermission.mockReturnValue(true);
		const rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = { baseUrl: 'http://localhost', pushRef: '' };
		tagsStore = useStore();
	});

	it('sets loading while the request is pending and clears it after success', async () => {
		const request = Promise.withResolvers<ITag[]>();
		mockApi.getTags.mockReturnValueOnce(request.promise);

		expect(tagsStore.isLoading).toBe(false);

		const result = tagsStore.fetchAll();

		expect(tagsStore.isLoading).toBe(true);

		request.resolve([mockTag]);

		await expect(result).resolves.toEqual([mockTag]);
		expect(tagsStore.isLoading).toBe(false);
		expect(tagsStore.allTags).toEqual([mockTag]);
	});

	it('clears loading after a failed request and allows a successful retry', async () => {
		const request = Promise.withResolvers<ITag[]>();
		const error = new Error('Could not load tags');
		mockApi.getTags.mockReturnValueOnce(request.promise);

		const result = tagsStore.fetchAll();
		const rejection = expect(result).rejects.toBe(error);

		expect(tagsStore.isLoading).toBe(true);

		request.reject(error);

		await rejection;
		expect(tagsStore.isLoading).toBe(false);

		const retryRequest = Promise.withResolvers<ITag[]>();
		mockApi.getTags.mockReturnValueOnce(retryRequest.promise);

		const retry = tagsStore.fetchAll();

		expect(tagsStore.isLoading).toBe(true);

		retryRequest.resolve([mockTag]);

		await expect(retry).resolves.toEqual([mockTag]);
		expect(tagsStore.isLoading).toBe(false);
		expect(tagsStore.allTags).toEqual([mockTag]);
		expect(mockApi.getTags).toHaveBeenCalledTimes(2);
	});

	it('keeps cached tags and clears loading after a failed forced refresh', async () => {
		mockApi.getTags.mockResolvedValueOnce([mockTag]);
		await tagsStore.fetchAll();

		const error = new Error('Could not refresh tags');
		mockApi.getTags.mockRejectedValueOnce(error);

		await expect(tagsStore.fetchAll({ force: true })).rejects.toBe(error);

		expect(tagsStore.isLoading).toBe(false);
		expect(tagsStore.allTags).toEqual([mockTag]);
		await expect(tagsStore.fetchAll()).resolves.toEqual([mockTag]);
		expect(mockApi.getTags).toHaveBeenCalledTimes(2);
	});
});

describe('useTagsStore — permission guards', () => {
	let tagsStore: ReturnType<typeof useTagsStore>;
	let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;

	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		vi.clearAllMocks();
		hasPermission.mockReturnValue(true);
		rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = { baseUrl: 'http://localhost', pushRef: '' };
		tagsStore = useTagsStore();
	});

	describe('fetchAll', () => {
		it('calls the API and caches results when tag:list is granted', async () => {
			mockApi.getTags.mockResolvedValue([mockTag]);

			const result = await tagsStore.fetchAll({ force: true });

			expect(mockApi.getTags).toHaveBeenCalledOnce();
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('1');
		});

		it('returns an empty array and skips the API when tag:list is denied', async () => {
			hasPermission.mockReturnValue(false);

			const result = await tagsStore.fetchAll({ force: true });

			expect(mockApi.getTags).not.toHaveBeenCalled();
			expect(result).toEqual([]);
		});
	});

	describe('create', () => {
		it('calls the API and upserts the tag when tag:create is granted', async () => {
			mockApi.createTag.mockResolvedValue(mockTag);

			const created = await tagsStore.create('test-tag');

			expect(mockApi.createTag).toHaveBeenCalledOnce();
			expect(created.id).toBe('1');
			expect(tagsStore.tagsById['1']).toEqual(mockTag);
		});

		it('throws without calling the API when tag:create is denied', async () => {
			hasPermission.mockReturnValue(false);

			await expect(tagsStore.create('test-tag')).rejects.toThrow(/insufficient permissions/i);
			expect(mockApi.createTag).not.toHaveBeenCalled();
		});
	});

	describe('rename', () => {
		it('calls the API and updates the tag when tag:update is granted', async () => {
			const updated = { ...mockTag, name: 'renamed' };
			mockApi.updateTag.mockResolvedValue(updated);

			const result = await tagsStore.rename({ id: '1', name: 'renamed' });

			expect(mockApi.updateTag).toHaveBeenCalledOnce();
			expect(result.name).toBe('renamed');
		});

		it('throws without calling the API when tag:update is denied', async () => {
			hasPermission.mockReturnValue(false);

			await expect(tagsStore.rename({ id: '1', name: 'renamed' })).rejects.toThrow(
				/insufficient permissions/i,
			);
			expect(mockApi.updateTag).not.toHaveBeenCalled();
		});
	});

	describe('deleteTagById', () => {
		it('calls the API and removes the tag from state when tag:delete is granted', async () => {
			mockApi.deleteTag.mockResolvedValue(true);
			tagsStore.upsertTags([mockTag]);

			const deleted = await tagsStore.deleteTagById('1');

			expect(mockApi.deleteTag).toHaveBeenCalledOnce();
			expect(deleted).toBe(true);
			expect(tagsStore.tagsById['1']).toBeUndefined();
		});

		it('throws without calling the API when tag:delete is denied', async () => {
			hasPermission.mockReturnValue(false);

			await expect(tagsStore.deleteTagById('1')).rejects.toThrow(/insufficient permissions/i);
			expect(mockApi.deleteTag).not.toHaveBeenCalled();
		});
	});
});
