import { ref, computed } from 'vue';
import type {
	PromotableResource,
	PromotePackageResultDto,
	PromotionChanges,
	PromotionDirection,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getPromotableChanges, promoteProjectSelection } from '../promotions.api';
import {
	containerSelectionState,
	filterPromotionChanges,
	orderPromotionChanges,
	workflowIdsByContainer,
	type SelectionState,
} from '../structuralSelection';

export function usePromotionChanges(projectId: string, direction: PromotionDirection = 'promote') {
	const rootStore = useRootStore();

	const changes = ref<PromotableResource[]>([]);
	const commitSha = ref<string | null>(null);
	const source = ref<PromotionChanges['source'] | null>(null);
	const isLoading = ref(false);
	const isSubmitting = ref(false);
	const error = ref<Error | null>(null);
	const searchQuery = ref('');
	const lastRefreshedAt = ref<string | null>(null);

	// Workflow ids only. A renamed project or folder has no selection of its own: it is
	// included when any workflow inside it is selected.
	const selectedIds = ref<Set<string>>(new Set());

	// A search hit stays with the renamed containers above it.
	const filteredChanges = computed(() =>
		orderPromotionChanges(filterPromotionChanges(changes.value, searchQuery.value)),
	);

	const workflowsByContainer = computed(() => workflowIdsByContainer(changes.value));
	const visibleWorkflowsByContainer = computed(() => workflowIdsByContainer(filteredChanges.value));

	const selectedWorkflowIds = computed(() =>
		changes.value
			.filter((change) => change.type === 'workflow' && selectedIds.value.has(change.id))
			.map((change) => change.id),
	);

	// Each selected workflow counts once, and so does each container that has one inside it.
	const selectedCount = computed(() => {
		let includedContainers = 0;
		for (const workflowIds of workflowsByContainer.value.values()) {
			if (workflowIds.some((id) => selectedIds.value.has(id))) includedContainers += 1;
		}
		return selectedWorkflowIds.value.length + includedContainers;
	});

	const visibleWorkflowIds = computed(() =>
		filteredChanges.value.filter((c) => c.type === 'workflow').map((c) => c.id),
	);

	// Select-all state reflects the visible (filtered) workflows, not the full list.
	const allSelected = computed(
		() =>
			visibleWorkflowIds.value.length > 0 &&
			visibleWorkflowIds.value.every((id) => selectedIds.value.has(id)),
	);

	const someSelected = computed(
		() => visibleWorkflowIds.value.some((id) => selectedIds.value.has(id)) && !allSelected.value,
	);

	/** Checkbox state of a visible row. A container follows the visible workflows inside it. */
	function selectionState(id: string): SelectionState {
		const visibleWorkflows = visibleWorkflowsByContainer.value.get(id);
		if (!visibleWorkflows) return selectedIds.value.has(id) ? 'checked' : 'unchecked';
		return containerSelectionState(visibleWorkflows, selectedIds.value);
	}

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
			source.value = result.source;
			reconcileSelection();
			lastRefreshedAt.value = new Date().toISOString();
		} catch (e) {
			error.value = e instanceof Error ? e : new Error(String(e));
		} finally {
			isLoading.value = false;
		}
	}

	// A container toggles the visible workflows inside it: all off when all are on, else all on.
	function toggleSelected(id: string) {
		if (isSubmitting.value) return;
		const next = new Set(selectedIds.value);
		const containerWorkflows = visibleWorkflowsByContainer.value.get(id);
		if (containerWorkflows) {
			const clear = containerWorkflows.every((workflowId) => next.has(workflowId));
			for (const workflowId of containerWorkflows) {
				if (clear) next.delete(workflowId);
				else next.add(workflowId);
			}
		} else if (changes.value.some((change) => change.id === id)) {
			if (next.has(id)) next.delete(id);
			else next.add(id);
		}
		selectedIds.value = next;
	}

	// Add or remove only the currently visible workflows.
	function toggleSelectAll() {
		if (isSubmitting.value) return;
		const next = new Set(selectedIds.value);
		for (const id of visibleWorkflowIds.value) {
			if (allSelected.value) next.delete(id);
			else next.add(id);
		}
		selectedIds.value = next;
	}

	async function submitSelection(): Promise<PromotePackageResultDto | null> {
		const workflowIds = selectedWorkflowIds.value;
		if (workflowIds.length === 0 || isSubmitting.value) return null;

		isSubmitting.value = true;
		try {
			return await promoteProjectSelection(rootStore.publicApiContext, projectId, {
				workflowIds,
			});
		} finally {
			isSubmitting.value = false;
		}
	}

	return {
		changes,
		commitSha,
		source,
		filteredChanges,
		isLoading,
		isSubmitting,
		error,
		searchQuery,
		lastRefreshedAt,
		selectedIds,
		selectedCount,
		selectedWorkflowIds,
		selectionState,
		workflowsByContainer,
		allSelected,
		someSelected,
		fetchChanges,
		submitSelection,
		toggleSelected,
		toggleSelectAll,
	};
}
