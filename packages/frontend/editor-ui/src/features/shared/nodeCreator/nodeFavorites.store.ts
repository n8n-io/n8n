import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

import {
	GOOGLE_GMAIL_NODE_TYPE,
	LOCAL_STORAGE_NODE_FAVORITES,
	MICROSOFT_SHAREPOINT_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	TELEGRAM_NODE_TYPE,
} from '@/app/constants';

/** Demo seed shown until the user changes their favorites */
export const DEFAULT_NODE_FAVORITES = [
	GOOGLE_GMAIL_NODE_TYPE,
	TELEGRAM_NODE_TYPE,
	MICROSOFT_SHAREPOINT_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
];

/**
 * Node types the user starred in the node creator, persisted in localStorage.
 */
export const useNodeFavoritesStore = defineStore('nodeFavorites', () => {
	const favoriteNodeNames = useLocalStorage<string[]>(LOCAL_STORAGE_NODE_FAVORITES, [
		...DEFAULT_NODE_FAVORITES,
	]);

	// Hand-edited storage can hold valid JSON of the wrong shape, which would crash consumers
	if (!Array.isArray(favoriteNodeNames.value)) {
		favoriteNodeNames.value = [...DEFAULT_NODE_FAVORITES];
	}

	function isFavorite(nodeName: string) {
		return favoriteNodeNames.value.includes(nodeName);
	}

	function toggleFavorite(nodeName: string) {
		if (isFavorite(nodeName)) {
			favoriteNodeNames.value = favoriteNodeNames.value.filter((name) => name !== nodeName);
		} else {
			favoriteNodeNames.value = [...favoriteNodeNames.value, nodeName];
		}
	}

	return {
		favoriteNodeNames,
		isFavorite,
		toggleFavorite,
	};
});
