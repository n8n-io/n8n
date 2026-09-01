import { ref, computed } from 'vue';
import type { PromotableResource } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getPromotableChanges, promoteChanges } from '../promotions.api';

export function usePromotionChanges(projectId: string) {
	const rootStore = useRootStore();

	const changes = ref<PromotableResource[]>([]);
	const isLoading = ref(false);
	const error = ref<Error | null>(null);

	const selectedIds = ref<Set<string>>(new Set());

	const selectedCount = computed(() => selectedIds.value.size);

	const allSelected = computed(
		() => changes.value.length > 0 && selectedIds.value.size === changes.value.length,
	);

	const someSelected = computed(
		() => selectedIds.value.size > 0 && selectedIds.value.size < changes.value.length,
	);

	async function fetchChanges(search?: string) {
		isLoading.value = true;
		error.value = null;
		try {
			changes.value = await getPromotableChanges(rootStore.restApiContext, projectId, {
				search,
			});
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

	function toggleSelectAll() {
		if (allSelected.value) {
			selectedIds.value = new Set();
		} else {
			selectedIds.value = new Set(changes.value.map((c) => c.id));
		}
	}

	async function promote(createBranch: boolean) {
		return await promoteChanges(rootStore.restApiContext, projectId, {
			workflowIds: [...selectedIds.value],
			createBranch,
		});
	}

	return {
		changes,
		isLoading,
		error,
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
