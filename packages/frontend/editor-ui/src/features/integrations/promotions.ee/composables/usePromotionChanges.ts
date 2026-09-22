import { ref, computed, watch } from 'vue';
import type { PromotionDirection } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	ensurePromotionChanges,
	getPromotionChangesEntry,
	refreshPromotionChanges,
} from './promotionChanges.cache';

export function usePromotionChanges(projectId: string, direction: PromotionDirection = 'promote') {
	const rootStore = useRootStore();
	const entry = getPromotionChangesEntry(projectId, direction);

	// The rows are shared with the banner; the search and the selection belong to this view.
	const { changes, commitSha, isLoading, error, lastRefreshedAt } = entry;
	const searchQuery = ref('');
	const selectedIds = ref<Set<string>>(new Set());

	// Only the rows the user can currently see are eligible for select-all.
	const filteredChanges = computed(() => {
		if (!searchQuery.value) return changes.value;
		const term = searchQuery.value.toLowerCase();
		return changes.value.filter((c) => c.name.toLowerCase().includes(term));
	});

	const selectedCount = computed(() => selectedIds.value.size);

	// Select-all state reflects the visible (filtered) rows, not the full list.
	const allSelected = computed(
		() =>
			filteredChanges.value.length > 0 &&
			filteredChanges.value.every((c) => selectedIds.value.has(c.id)),
	);

	const someSelected = computed(
		() => filteredChanges.value.some((c) => selectedIds.value.has(c.id)) && !allSelected.value,
	);

	// Drop selections for rows the latest load no longer has.
	watch(changes, () => {
		const availableIds = new Set(changes.value.map((c) => c.id));
		selectedIds.value = new Set([...selectedIds.value].filter((id) => availableIds.has(id)));
	});

	/** Reuses the rows the banner already loaded, so opening this view costs no request. */
	async function loadChanges() {
		await ensurePromotionChanges(rootStore.restApiContext, projectId, direction);
	}

	async function fetchChanges() {
		await refreshPromotionChanges(rootStore.restApiContext, projectId, direction);
	}

	function toggleSelected(id: string) {
		const next = new Set(selectedIds.value);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds.value = next;
	}

	// Add or remove only the currently visible rows; hidden selections are untouched.
	function toggleSelectAll() {
		const next = new Set(selectedIds.value);
		if (allSelected.value) {
			for (const c of filteredChanges.value) next.delete(c.id);
		} else {
			for (const c of filteredChanges.value) next.add(c.id);
		}
		selectedIds.value = next;
	}

	return {
		changes,
		commitSha,
		filteredChanges,
		isLoading,
		error,
		searchQuery,
		lastRefreshedAt,
		selectedIds,
		selectedCount,
		allSelected,
		someSelected,
		loadChanges,
		fetchChanges,
		toggleSelected,
		toggleSelectAll,
	};
}
