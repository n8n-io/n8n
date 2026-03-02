import { createPinia, setActivePinia } from 'pinia';
import { useFavoritesStore } from './favorites.store';
import * as favoritesApi from '@/app/api/favorites';
import type { UserFavorite } from '@/app/api/favorites';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', pushRef: 'test' },
	})),
}));

vi.mock('@/app/api/favorites');

const makeFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite => ({
	id: 1,
	userId: 'user-1',
	resourceId: 'res-1',
	resourceType: 'workflow',
	resourceName: 'My Workflow',
	...overrides,
});

describe('favorites.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('fetchFavorites()', () => {
		it('should fetch and store favorites on first call', async () => {
			const favorites = [makeFavorite()];
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue(favorites);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(favoritesApi.getFavorites).toHaveBeenCalledTimes(1);
			expect(store.favorites).toEqual(favorites);
		});

		it('should not fetch again when already initialized', async () => {
			const favorites = [makeFavorite()];
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue(favorites);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			await store.fetchFavorites();

			expect(favoritesApi.getFavorites).toHaveBeenCalledTimes(1);
		});
	});

	describe('isFavorite()', () => {
		it('should return true for a favorited resource with matching type', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.isFavorite('wf-1', 'workflow')).toBe(true);
		});

		it('should return false for a non-favorited resource', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.isFavorite('wf-99', 'workflow')).toBe(false);
		});

		it('should return false when ID matches but resourceType differs', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'res-1', resourceType: 'workflow' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.isFavorite('res-1', 'project')).toBe(false);
		});
	});

	describe('renameFavorite()', () => {
		it('should update the resourceName of the matching favorite', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow', resourceName: 'Old Name' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			store.renameFavorite('wf-1', 'workflow', 'New Name');

			expect(store.favorites[0].resourceName).toBe('New Name');
		});

		it('should not modify favorites when no match is found', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow', resourceName: 'Old Name' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			store.renameFavorite('wf-99', 'workflow', 'New Name');

			expect(store.favorites[0].resourceName).toBe('Old Name');
		});

		it('should not rename when resourceType does not match', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'res-1', resourceType: 'workflow', resourceName: 'Old Name' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			store.renameFavorite('res-1', 'folder', 'New Name');

			expect(store.favorites[0].resourceName).toBe('Old Name');
		});
	});

	describe('toggleFavorite()', () => {
		it('should remove a favorite when it is already favorited', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
			]);
			vi.mocked(favoritesApi.removeFavorite).mockResolvedValue(true);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			await store.toggleFavorite('wf-1', 'workflow');

			expect(favoritesApi.removeFavorite).toHaveBeenCalledWith(
				expect.anything(),
				'wf-1',
				'workflow',
			);
			expect(store.favorites).toHaveLength(0);
		});

		it('should add a favorite and re-fetch when it is not favorited', async () => {
			const newFavorite = makeFavorite({ resourceId: 'wf-2', resourceType: 'workflow' });
			vi.mocked(favoritesApi.getFavorites)
				.mockResolvedValueOnce([]) // initial fetch
				.mockResolvedValueOnce([newFavorite]); // re-fetch after add
			vi.mocked(favoritesApi.addFavorite).mockResolvedValue(newFavorite);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			await store.toggleFavorite('wf-2', 'workflow');

			expect(favoritesApi.addFavorite).toHaveBeenCalledWith(expect.anything(), 'wf-2', 'workflow');
			expect(store.favorites).toEqual([newFavorite]);
		});

		it('should not modify local state when addFavorite API throws', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([]);
			vi.mocked(favoritesApi.addFavorite).mockRejectedValue(new Error('API error'));

			const store = useFavoritesStore();
			await store.fetchFavorites();

			await expect(store.toggleFavorite('wf-2', 'workflow')).rejects.toThrow('API error');
			expect(store.favorites).toHaveLength(0);
		});

		it('should not remove from local state when removeFavorite API throws', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
			]);
			vi.mocked(favoritesApi.removeFavorite).mockRejectedValue(new Error('API error'));

			const store = useFavoritesStore();
			await store.fetchFavorites();

			await expect(store.toggleFavorite('wf-1', 'workflow')).rejects.toThrow('API error');
			expect(store.favorites).toHaveLength(1);
		});
	});

	describe('removeFavoriteLocally()', () => {
		it('should remove the matching favorite from local state without API call', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
				makeFavorite({ id: 2, resourceId: 'proj-1', resourceType: 'project' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			store.removeFavoriteLocally('wf-1', 'workflow');

			expect(store.favorites).toHaveLength(1);
			expect(store.favorites[0].resourceId).toBe('proj-1');
			expect(favoritesApi.removeFavorite).not.toHaveBeenCalled();
		});

		it('should not remove when resourceType does not match', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'res-1', resourceType: 'workflow' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			store.removeFavoriteLocally('res-1', 'folder');

			expect(store.favorites).toHaveLength(1);
		});
	});

	describe('reset()', () => {
		it('should clear favorites and reset initialized flag', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([makeFavorite()]);

			const store = useFavoritesStore();
			await store.fetchFavorites();
			expect(store.favorites).toHaveLength(1);

			store.reset();
			expect(store.favorites).toHaveLength(0);

			// Should allow fetching again after reset
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([makeFavorite()]);
			await store.fetchFavorites();
			expect(favoritesApi.getFavorites).toHaveBeenCalledTimes(2);
		});
	});

	describe('computed getters', () => {
		it('should return workflow favorite IDs', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
				makeFavorite({ id: 2, resourceId: 'proj-1', resourceType: 'project' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.workflowFavoriteIds).toEqual(['wf-1']);
		});

		it('should return project favorite IDs', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
				makeFavorite({ id: 2, resourceId: 'proj-1', resourceType: 'project' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.projectFavoriteIds).toEqual(['proj-1']);
		});

		it('should return data table favorite IDs', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
				makeFavorite({ id: 2, resourceId: 'dt-1', resourceType: 'dataTable' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.dataTableFavoriteIds).toEqual(['dt-1']);
		});

		it('should return folder favorite IDs', async () => {
			vi.mocked(favoritesApi.getFavorites).mockResolvedValue([
				makeFavorite({ resourceId: 'wf-1', resourceType: 'workflow' }),
				makeFavorite({ id: 2, resourceId: 'folder-1', resourceType: 'folder' }),
			]);

			const store = useFavoritesStore();
			await store.fetchFavorites();

			expect(store.folderFavoriteIds).toEqual(['folder-1']);
		});

		it('should return empty arrays when no favorites exist', () => {
			const store = useFavoritesStore();

			expect(store.workflowFavoriteIds).toEqual([]);
			expect(store.projectFavoriteIds).toEqual([]);
			expect(store.dataTableFavoriteIds).toEqual([]);
			expect(store.folderFavoriteIds).toEqual([]);
		});
	});
});
