import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as favoritesApi from '@/app/api/favorites';
import type { FavoriteResourceType, UserFavorite } from '@/app/api/favorites';
import { useTelemetry } from '@/app/composables/useTelemetry';

export const useFavoritesStore = defineStore(STORES.FAVORITES, () => {
	const rootStore = useRootStore();
	const telemetry = useTelemetry();

	const favorites = ref<UserFavorite[]>([]);
	const initialized = ref(false);

	const workflowFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'workflow').map((f) => f.resourceId),
	);

	const projectFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'project').map((f) => f.resourceId),
	);

	const dataTableFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'dataTable').map((f) => f.resourceId),
	);

	const folderFavoriteIds = computed(() =>
		favorites.value.filter((f) => f.resourceType === 'folder').map((f) => f.resourceId),
	);

	async function fetchFavorites() {
		if (initialized.value) return;
		const currentPushRef = rootStore.restApiContext.pushRef;
		const result = await favoritesApi.getFavorites(rootStore.restApiContext);
		// Avoid theoretical session issues by asserting we still have the same pushRef
		if (currentPushRef !== rootStore.restApiContext.pushRef) return;
		favorites.value = result;
		initialized.value = true;
	}

	function isFavorite(resourceId: string, resourceType: FavoriteResourceType): boolean {
		return favorites.value.some(
			(f) => f.resourceId === resourceId && f.resourceType === resourceType,
		);
	}

	function renameFavorite(resourceId: string, resourceType: FavoriteResourceType, newName: string) {
		const favorite = favorites.value.find(
			(f) => f.resourceId === resourceId && f.resourceType === resourceType,
		);
		if (favorite) {
			favorite.resourceName = newName;
		}
	}

	async function toggleFavorite(resourceId: string, resourceType: FavoriteResourceType) {
		if (isFavorite(resourceId, resourceType)) {
			try {
				await favoritesApi.removeFavorite(rootStore.restApiContext, resourceId, resourceType);
			} catch (e: unknown) {
				if ((e as { httpStatusCode?: number }).httpStatusCode !== 404) throw e;
			}
			favorites.value = favorites.value.filter(
				(f) => !(f.resourceId === resourceId && f.resourceType === resourceType),
			);
			telemetry.track('User toggled favorite', {
				action: 'removed',
				resource_type: resourceType,
			});
		} else {
			await favoritesApi.addFavorite(rootStore.restApiContext, resourceId, resourceType);
			// Re-fetch to get enriched metadata from the server
			favorites.value = await favoritesApi.getFavorites(rootStore.restApiContext);
			telemetry.track('User toggled favorite', {
				action: 'added',
				resource_type: resourceType,
			});
		}
	}

	function removeFavoriteLocally(resourceId: string, resourceType: FavoriteResourceType) {
		favorites.value = favorites.value.filter(
			(f) => !(f.resourceId === resourceId && f.resourceType === resourceType),
		);
	}

	function reset() {
		favorites.value = [];
		initialized.value = false;
	}

	return {
		favorites,
		workflowFavoriteIds,
		projectFavoriteIds,
		dataTableFavoriteIds,
		folderFavoriteIds,
		fetchFavorites,
		isFavorite,
		renameFavorite,
		toggleFavorite,
		removeFavoriteLocally,
		reset,
	};
});
