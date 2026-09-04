import { ref, computed } from 'vue';
import type { PromotableResource } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getPromotableChanges, promoteChanges } from '../promotions.api';

export function usePromotionChanges(projectId: string) {
	const rootStore = useRootStore();

	const changes = ref<PromotableResource[]>([]);
	const isLoading = ref(false);
	const error = ref<Error | null>(null);
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

	// Drop selections whose resource no longer exists in the latest response.
	function reconcileSelection() {
		const availableIds = new Set(changes.value.map((c) => c.id));
		selectedIds.value = new Set([...selectedIds.value].filter((id) => availableIds.has(id)));
	}

	async function fetchChanges(search?: string) {
		isLoading.value = true;
		error.value = null;
		try {
			changes.value = await getPromotableChanges(rootStore.restApiContext, projectId, {
				search,
			});
			reconcileSelection();
		} catch (e) {
			error.value = e instanceof Error ? e : new Error(String(e));
		} finally {
			isLoading.value = false;
		}
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

	async function promote(createBranch: boolean) {
		return await promoteChanges(rootStore.restApiContext, projectId, {
			workflowIds: [...selectedIds.value],
			createBranch,
		});
	}

	return {
		changes,
		filteredChanges,
		isLoading,
		error,
		searchQuery,
		selectedIds,
		selectedCount,
		allSelected,
		someSelected,
		fetchChanges,
		toggleSelected,
		toggleSelectAll,
		promote,
	};
}
