import type { GraphNode } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

import { useSelectionValidation } from '@/app/composables/useSelectionValidation';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export function useCanvasNodeGroupActions(
	selectedNodes: MaybeRefOrGetter<GraphNode[]>,
	options?: { readOnly?: MaybeRefOrGetter<boolean> },
) {
	const i18n = useI18n();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const { isSelectionGroupable, expandSelectionWithSubNodes } = useSelectionValidation();

	const isReadOnly = computed(() => toValue(options?.readOnly) ?? false);

	const expandedSelectionIds = computed(() => {
		return expandSelectionWithSubNodes(toValue(selectedNodes).map((n) => n.id));
	});

	const canGroup = computed(() => {
		if (isReadOnly.value) return false;
		return isSelectionGroupable(expandedSelectionIds.value).valid;
	});

	const selectedGroupIds = computed(() => {
		if (isReadOnly.value) return [];
		const ids = new Set<string>();
		for (const node of toValue(selectedNodes)) {
			const group = workflowDocumentStore.value.getGroupForNode(node.id);
			if (group) ids.add(group.id);
		}
		return Array.from(ids);
	});

	const canUngroup = computed(() => selectedGroupIds.value.length > 0);

	function groupSelection(): IWorkflowGroup | null {
		if (!canGroup.value) return null;
		const name = workflowDocumentStore.value.getNextDefaultName(
			i18n.baseText('canvas.nodeGroup.defaultTitle'),
		);
		return workflowDocumentStore.value.createGroup(expandedSelectionIds.value, name);
	}

	return {
		canGroup,
		canUngroup,
		expandedSelectionIds,
		selectedGroupIds,
		groupSelection,
	};
}
