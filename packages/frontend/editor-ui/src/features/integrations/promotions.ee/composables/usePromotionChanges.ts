import { ref, computed } from 'vue';
import type {
	PromotableResource,
	PromotePackageResultDto,
	PromotionDirection,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getPromotableChanges, promoteProjectSelection } from '../promotions.api';

export function usePromotionChanges(projectId: string, direction: PromotionDirection = 'promote') {
	const rootStore = useRootStore();

	const changes = ref<PromotableResource[]>([]);
	const commitSha = ref<string | null>(null);
	const isLoading = ref(false);
	const isSubmitting = ref(false);
	const error = ref<Error | null>(null);
	const searchQuery = ref('');
	const lastRefreshedAt = ref<string | null>(null);

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

	async function fetchChanges() {
		if (isLoading.value || isSubmitting.value) return;
		isLoading.value = true;
		error.value = null;
		try {
			const result = await getPromotableChanges(rootStore.restApiContext, projectId, direction);
			changes.value = result.changes;
			commitSha.value = result.commitSha;
			reconcileSelection();
			lastRefreshedAt.value = new Date().toISOString();
		} catch (e) {
			error.value = e instanceof Error ? e : new Error(String(e));
		} finally {
			isLoading.value = false;
		}
	}

	function toggleSelected(id: string) {
		if (isSubmitting.value) return;
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
		if (isSubmitting.value) return;
		const next = new Set(selectedIds.value);
		if (allSelected.value) {
			for (const c of filteredChanges.value) next.delete(c.id);
		} else {
			for (const c of filteredChanges.value) next.add(c.id);
		}
		selectedIds.value = next;
	}

	async function submitSelection(): Promise<PromotePackageResultDto | null> {
		if (selectedCount.value === 0 || isSubmitting.value) return null;

		isSubmitting.value = true;
		try {
			return await promoteProjectSelection(rootStore.publicApiContext, projectId, {
				workflowIds: [...selectedIds.value],
			});
		} finally {
			isSubmitting.value = false;
		}
	}

	return {
		changes,
		commitSha,
		filteredChanges,
		isLoading,
		isSubmitting,
		error,
		searchQuery,
		lastRefreshedAt,
		selectedIds,
		selectedCount,
		allSelected,
		someSelected,
		fetchChanges,
		submitSelection,
		toggleSelected,
		toggleSelectAll,
	};
}
