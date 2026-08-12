import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import { GOOGLE_GMAIL_NODE_TYPE, LOCAL_STORAGE_NODE_FAVORITES } from '@/app/constants';
import { DEFAULT_NODE_FAVORITES, useNodeFavoritesStore } from './nodeFavorites.store';

describe('nodeFavorites.store', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it('seeds the demo defaults when localStorage is empty', () => {
		const store = useNodeFavoritesStore();

		expect(store.favoriteNodeNames).toEqual(DEFAULT_NODE_FAVORITES);
		expect(store.isFavorite(GOOGLE_GMAIL_NODE_TYPE)).toBe(true);
	});

	it('toggles favorites and persists them to localStorage', async () => {
		const store = useNodeFavoritesStore();

		store.toggleFavorite('n8n-nodes-base.slack');
		expect(store.isFavorite('n8n-nodes-base.slack')).toBe(true);
		expect(store.favoriteNodeNames).toEqual([...DEFAULT_NODE_FAVORITES, 'n8n-nodes-base.slack']);

		store.toggleFavorite(GOOGLE_GMAIL_NODE_TYPE);
		expect(store.isFavorite(GOOGLE_GMAIL_NODE_TYPE)).toBe(false);

		await nextTick();
		expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_NODE_FAVORITES) ?? '[]')).toEqual(
			store.favoriteNodeNames,
		);
	});

	it('reads existing favorites from localStorage instead of the defaults', () => {
		localStorage.setItem(LOCAL_STORAGE_NODE_FAVORITES, JSON.stringify(['n8n-nodes-base.if']));

		const store = useNodeFavoritesStore();

		expect(store.favoriteNodeNames).toEqual(['n8n-nodes-base.if']);
		expect(store.isFavorite(GOOGLE_GMAIL_NODE_TYPE)).toBe(false);
	});

	it('resets to the defaults when localStorage holds valid JSON of the wrong shape', () => {
		localStorage.setItem(LOCAL_STORAGE_NODE_FAVORITES, JSON.stringify({ not: 'an array' }));

		const store = useNodeFavoritesStore();

		expect(store.favoriteNodeNames).toEqual(DEFAULT_NODE_FAVORITES);
		expect(store.isFavorite(GOOGLE_GMAIL_NODE_TYPE)).toBe(true);
	});
});
