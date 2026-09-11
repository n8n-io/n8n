import { computed } from 'vue';
import { createEventHook } from '@vueuse/core';
import uniq from 'lodash/uniq';
import { normalizeGroupDescription, type IWorkflowGroup } from 'n8n-workflow';
import { CHANGE_ACTION } from './types';
import {
	useWorkflowDocumentStructure,
	type WorkflowDocumentStructure,
} from './useWorkflowDocumentStructure';

export type {
	NodeGroupAddedPayload,
	NodeGroupChangeEvent,
	NodeGroupPayload,
	NodeGroupRemovedPayload,
	NodeGroupsSetPayload,
} from './useWorkflowDocumentStructure';

type NodeGroupMutationOptions = {
	markDirty?: boolean;
};

type NodeGroupCreateOptions = NodeGroupMutationOptions & {
	/** Start the group collapsed in the canvas view (e.g. imported/pasted groups). */
	startCollapsed?: boolean;
	/** Optional description to seed the group with (e.g. imported/pasted groups). */
	description?: string;
};

export function useWorkflowDocumentNodeGroups({
	structure = useWorkflowDocumentStructure(),
}: { structure?: WorkflowDocumentStructure } = {}) {
	const groups = computed(() => structure.state.value.groups);

	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	const allGroups = computed(() => Array.from(groups.value.values()));

	const nodeIdToGroupId = computed(() => {
		const index = new Map<string, string>();
		for (const group of groups.value.values()) {
			for (const nodeId of group.nodeIds) {
				index.set(nodeId, group.id);
			}
		}
		return index;
	});

	function applySetNodeGroups(nextGroups: IWorkflowGroup[]) {
		structure.setNodeGroups(nextGroups);
	}

	function applyUpsertGroup(
		group: IWorkflowGroup,
		action: typeof CHANGE_ACTION.ADD | typeof CHANGE_ACTION.UPDATE,
		{ markDirty = true, startCollapsed }: NodeGroupCreateOptions = {},
	) {
		groups.value.set(group.id, group);
		const reactiveGroup = groups.value.get(group.id);
		if (!reactiveGroup) return;
		if (action === CHANGE_ACTION.ADD) {
			structure.emitNodeGroupsChange({
				action,
				payload: { group: reactiveGroup, startCollapsed },
			});
		} else {
			structure.emitNodeGroupsChange({ action, payload: { group: reactiveGroup } });
		}
		if (markDirty) {
			void onStateDirty.trigger();
		}
	}

	function applyDeleteGroup(id: string) {
		groups.value.delete(id);
		structure.emitNodeGroupsChange({
			action: CHANGE_ACTION.DELETE,
			payload: { id },
		});
		void onStateDirty.trigger();
	}

	function setNodeGroups(nextGroups: IWorkflowGroup[]) {
		applySetNodeGroups(nextGroups);
	}

	function createGroup(
		nodeIds: string[],
		name: string,
		options: NodeGroupCreateOptions = {},
	): IWorkflowGroup {
		const description = normalizeGroupDescription(options.description);
		const group: IWorkflowGroup = {
			id: window.crypto.randomUUID(),
			nodeIds: [...nodeIds],
			name,
			...(description ? { description } : {}),
		};
		applyUpsertGroup(group, CHANGE_ACTION.ADD, options);
		return group;
	}

	function getNextDefaultName(baseName: string) {
		const names = new Set(allGroups.value.map((group) => group.name));
		let index = 1;
		let name = baseName;
		const match = baseName.match(/(\d+)$/);
		if (match) {
			index = parseInt(match[1], 10);
			name = baseName.slice(0, -match[1].length);
		} else {
			name = `${baseName} `;
		}

		while (names.has(`${name}${index}`)) {
			index++;
		}

		return `${name}${index}`;
	}

	function updateName(id: string, name: string) {
		const group = groups.value.get(id);
		if (!group || group.name === name) return;
		let newName = name;
		if (allGroups.value.some((g) => g.name === name)) {
			newName = getNextDefaultName(name);
		}
		applyUpsertGroup({ ...group, name: newName }, CHANGE_ACTION.UPDATE);
	}

	function updateDescription(id: string, description: string) {
		const group = groups.value.get(id);
		if (!group) return;
		const next = normalizeGroupDescription(description);
		if (group.description === next) return;
		applyUpsertGroup({ ...group, description: next }, CHANGE_ACTION.UPDATE);
	}

	function deleteGroup(id: string) {
		if (!groups.value.has(id)) return;
		applyDeleteGroup(id);
	}

	// Id-preserving upsert used by undo/redo to restore a group snapshot.
	function restoreGroup(group: IWorkflowGroup) {
		const action = groups.value.has(group.id) ? CHANGE_ACTION.UPDATE : CHANGE_ACTION.ADD;
		applyUpsertGroup({ ...group, nodeIds: [...group.nodeIds] }, action);
	}

	function addNodesToGroup(id: string, nodeIds: string[]) {
		const group = groups.value.get(id);
		if (!group) return;

		const existing = new Set(group.nodeIds);
		const added = nodeIds.filter((nodeId) => !existing.has(nodeId));
		if (added.length === 0) return;

		applyUpsertGroup({ ...group, nodeIds: [...group.nodeIds, ...added] }, CHANGE_ACTION.UPDATE);
	}

	function replaceNodeInGroup(id: string, previousNodeId: string, newNodeId: string) {
		if (previousNodeId === newNodeId) return;
		const group = groups.value.get(id);
		if (!group?.nodeIds.includes(previousNodeId)) return;

		applyUpsertGroup(
			{
				...group,
				nodeIds: uniq(
					group.nodeIds.map((nodeId) => (nodeId === previousNodeId ? newNodeId : nodeId)),
				),
			},
			CHANGE_ACTION.UPDATE,
		);
	}

	function getGroupById(id: string): IWorkflowGroup | undefined {
		return groups.value.get(id);
	}

	function getGroupForNode(nodeId: string): IWorkflowGroup | undefined {
		const groupId = nodeIdToGroupId.value.get(nodeId);
		return groupId ? groups.value.get(groupId) : undefined;
	}

	function removeNodeFromGroups(nodeId: string) {
		for (const group of groups.value.values()) {
			if (!group.nodeIds.includes(nodeId)) continue;
			const remaining = group.nodeIds.filter((id) => id !== nodeId);
			if (remaining.length === 0) {
				applyDeleteGroup(group.id);
			} else {
				applyUpsertGroup({ ...group, nodeIds: remaining }, CHANGE_ACTION.UPDATE);
			}
		}
	}

	function clearNodeGroups() {
		if (groups.value.size === 0) return;
		applySetNodeGroups([]);
	}

	return {
		allGroups,
		nodeIdToGroupId,
		setNodeGroups,
		createGroup,
		getNextDefaultName,
		updateName,
		updateDescription,
		deleteGroup,
		restoreGroup,
		addNodesToGroup,
		replaceNodeInGroup,
		getGroupById,
		getGroupForNode,
		removeNodeFromGroups,
		clearNodeGroups,
		onNodeGroupsChange: structure.onNodeGroupsChange,
		onStateDirty: onStateDirty.on,
	};
}
