import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as favoritesApi from '@/app/api/favorites';
import type { FavoriteResourceType, UserFavorite } from '@/app/api/favorites';

export const useFavoritesStore = defineStore(STORES.FAVORITES, () => {
	const rootStore = useRootStore();

	const favorites = ref<UserFavorite[]>([]);
	const initialized = ref(false);

	const favoriteIds = computed(() => new Set(favorites.value.map((f) => f.resourceId)));

	const workflowFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'workflow').map((f) => f.resourceId),
	);

	const projectFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'project').map((f) => f.resourceId),
	);

	const dataTableFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'dataTable').map((f) => f.resourceId),
	);

	async function fetchFavorites() {
		if (initialized.value) return;
		initialized.value = true;
		favorites.value = await favoritesApi.getFavorites(rootStore.restApiContext);
	}

	function isFavorite(resourceId: string): boolean {
		return favoriteIds.value.has(resourceId);
	}

	async function toggleFavorite(resourceId: string, resourceType: FavoriteResourceType) {
		if (isFavorite(resourceId)) {
			await favoritesApi.removeFavorite(rootStore.restApiContext, resourceId, resourceType);
			favorites.value = favorites.value.filter((f) => f.resourceId !== resourceId);
		} else {
			await favoritesApi.addFavorite(rootStore.restApiContext, resourceId, resourceType);
			// Re-fetch to get enriched metadata from the server
			favorites.value = await favoritesApi.getFavorites(rootStore.restApiContext);
		}
	}

	return {
		favorites,
		favoriteIds,
		workflowFavoriteIds,
		projectFavoriteIds,
		dataTableFavoriteIds,
		fetchFavorites,
		isFavorite,
		toggleFavorite,
	};
});
