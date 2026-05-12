import type { GraphNode } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import type { MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

import { useSelectionValidation } from '@/app/composables/useSelectionValidation';
import { useCanvasNodeGroupsStore, type CanvasNodeGroup } from '../stores/canvasNodeGroups.store';

export function useCanvasNodeGroupActions(
	selectedNodes: MaybeRefOrGetter<GraphNode[]>,
	options?: { readOnly?: MaybeRefOrGetter<boolean> },
) {
	const i18n = useI18n();
	const groupsStore = useCanvasNodeGroupsStore();
	const { isSelectionGroupable, expandSelectionWithSubNodes } = useSelectionValidation();

	const isReadOnly = computed(() => toValue(options?.readOnly) ?? false);

	const expandedSelectionIds = computed(() => {
		const nodes = toValue(selectedNodes);
		if (isReadOnly.value || nodes.length < 2) return [];
		return expandSelectionWithSubNodes(nodes.map((n) => n.id));
	});

	const anyMemberGrouped = computed(() =>
		expandedSelectionIds.value.some((id) => groupsStore.getGroupForNode(id) !== undefined),
	);

	const canGroup = computed(() => {
		if (isReadOnly.value) return false;
		if (expandedSelectionIds.value.length < 2) return false;
		if (anyMemberGrouped.value) return false;
		return isSelectionGroupable(expandedSelectionIds.value).valid;
	});

	const selectedGroupIds = computed(() => {
		if (isReadOnly.value) return [];
		const ids = new Set<string>();
		for (const node of toValue(selectedNodes)) {
			const group = groupsStore.getGroupForNode(node.id);
			if (group) ids.add(group.id);
		}
		return Array.from(ids);
	});

	const canUngroup = computed(() => selectedGroupIds.value.length > 0);

	function groupSelection(): CanvasNodeGroup | null {
		if (!canGroup.value) return null;
		const title = groupsStore.getNextDefaultTitle(i18n.baseText('canvas.nodeGroup.defaultTitle'));
		return groupsStore.createGroup(expandedSelectionIds.value, title);
	}

	function ungroupSelection(): string[] {
		const ids = selectedGroupIds.value;
		for (const id of ids) {
			groupsStore.deleteGroup(id);
		}
		return ids;
	}

	return {
		canGroup,
		canUngroup,
		expandedSelectionIds,
		selectedGroupIds,
		groupSelection,
		ungroupSelection,
	};
}
