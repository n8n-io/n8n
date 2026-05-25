import { computed, ref } from 'vue';

export function useWorkflowDocumentNodeGroupsUi() {
	const collapsedGroupIds = ref<Set<string>>(new Set());

	function collapseGroup(id: string) {
		collapsedGroupIds.value = new Set(collapsedGroupIds.value).add(id);
	}

	function expandGroup(id: string) {
		if (!collapsedGroupIds.value.has(id)) return;
		const next = new Set(collapsedGroupIds.value);
		next.delete(id);
		collapsedGroupIds.value = next;
	}

	function toggleGroupCollapsed(id: string) {
		if (collapsedGroupIds.value.has(id)) {
			expandGroup(id);
			return;
		}

		collapseGroup(id);
	}

	function isGroupCollapsed(id: string) {
		return collapsedGroupIds.value.has(id);
	}

	function clearCollapsedGroups() {
		if (collapsedGroupIds.value.size === 0) return;
		collapsedGroupIds.value = new Set();
	}

	return {
		collapsedGroupIds: computed(() => collapsedGroupIds.value),
		collapseGroup,
		expandGroup,
		toggleGroupCollapsed,
		isGroupCollapsed,
		clearCollapsedGroups,
	};
}
