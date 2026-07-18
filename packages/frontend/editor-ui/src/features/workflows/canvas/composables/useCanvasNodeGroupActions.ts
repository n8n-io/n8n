import type { GraphNode } from '@vue-flow/core';
import { useI18n } from '@n8n/i18n';
import type { IWorkflowGroup } from 'n8n-workflow';
import type { MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

import { useSelectionValidation } from '@/app/composables/useSelectionValidation';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useHistoryStore } from '@/app/stores/history.store';
import {
	AddNodeGroupCommand,
	RemoveNodeGroupCommand,
	UpdateNodeGroupCommand,
} from '@/app/models/history';
import {
	isCanvasGroupNode,
	parseCanvasGroupNodeId,
} from '@/features/workflows/canvas/canvas.types';

function snapshotGroup(group: IWorkflowGroup): IWorkflowGroup {
	return { ...group, nodeIds: [...group.nodeIds] };
}

export function useCanvasNodeGroupActions(
	selectedNodes: MaybeRefOrGetter<GraphNode[]>,
	options?: { readOnly?: MaybeRefOrGetter<boolean> },
) {
	const i18n = useI18n();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const historyStore = useHistoryStore();
	const { resolveGroupableNodeIds } = useSelectionValidation();

	const isReadOnly = computed(() => toValue(options?.readOnly) ?? false);

	const selectedNodeIdsWithoutGroups = computed(() =>
		toValue(selectedNodes)
			.filter((n) => !isCanvasGroupNode(n))
			.map((n) => n.id),
	);

	const canGroup = computed(() => {
		if (isReadOnly.value) return false;
		return resolveGroupableNodeIds(selectedNodeIdsWithoutGroups.value) !== null;
	});

	const selectedGroupIds = computed(() => {
		if (isReadOnly.value) return [];
		const ids = new Set<string>();
		for (const node of toValue(selectedNodes)) {
			// Selected title bar: its id carries the group id
			const directGroupId = parseCanvasGroupNodeId(node.id);
			if (directGroupId) {
				ids.add(directGroupId);
				continue;
			}
			// Partial selection inside an expanded group: map a selected member back to it
			const group = workflowDocumentStore.value.getGroupForNode(node.id);
			if (group) {
				ids.add(group.id);
			}
		}
		return Array.from(ids);
	});

	const canUngroup = computed(() => selectedGroupIds.value.length > 0);

	/**
	 * Groups the given nodes (plus their attached AI sub-nodes) if they form a
	 * valid groupable subgraph. Unlike `groupSelection`, this works on explicit
	 * ids, so callers like the context menu can group nodes that aren't part of
	 * the current canvas selection. The group is created from exactly the ids
	 * that passed validation.
	 */
	function groupNodes(nodeIds: string[]): IWorkflowGroup | null {
		if (isReadOnly.value) return null;
		const memberIds = resolveGroupableNodeIds(nodeIds);
		if (!memberIds) return null;
		const name = workflowDocumentStore.value.getNextDefaultName(
			i18n.baseText('canvas.nodeGroup.defaultTitle'),
		);
		const group = workflowDocumentStore.value.createGroup(memberIds, name);
		historyStore.pushCommandToUndo(new AddNodeGroupCommand(group, Date.now()));
		return group;
	}

	function groupSelection(): IWorkflowGroup | null {
		return groupNodes(selectedNodeIdsWithoutGroups.value);
	}

	function renameGroup(id: string, name: string) {
		if (isReadOnly.value) return;
		const before = workflowDocumentStore.value.getGroupById(id);
		if (!before) return;
		const beforeSnapshot = snapshotGroup(before);
		workflowDocumentStore.value.updateName(id, name);
		const after = workflowDocumentStore.value.getGroupById(id);
		if (!after || after.name === beforeSnapshot.name) return;
		historyStore.pushCommandToUndo(
			new UpdateNodeGroupCommand(beforeSnapshot, snapshotGroup(after), Date.now()),
		);
	}

	function updateGroupDescription(id: string, description: string) {
		if (isReadOnly.value) return;
		const before = workflowDocumentStore.value.getGroupById(id);
		if (!before) return;
		const beforeSnapshot = snapshotGroup(before);
		workflowDocumentStore.value.updateDescription(id, description);
		const after = workflowDocumentStore.value.getGroupById(id);
		if (!after || after.description === beforeSnapshot.description) return;
		historyStore.pushCommandToUndo(
			new UpdateNodeGroupCommand(beforeSnapshot, snapshotGroup(after), Date.now()),
		);
	}

	function ungroup(id: string) {
		if (isReadOnly.value) return;
		const group = workflowDocumentStore.value.getGroupById(id);
		if (!group) return;
		const snapshot = snapshotGroup(group);
		workflowDocumentStore.value.deleteGroup(id);
		historyStore.pushCommandToUndo(new RemoveNodeGroupCommand(snapshot, Date.now()));
	}

	return {
		canGroup,
		canUngroup,
		selectedGroupIds,
		groupNodes,
		groupSelection,
		renameGroup,
		updateGroupDescription,
		ungroup,
	};
}
