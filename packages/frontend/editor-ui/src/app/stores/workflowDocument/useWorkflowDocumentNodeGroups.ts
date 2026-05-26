import { computed, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import uniq from 'lodash/uniq';
import type { IWorkflowGroup } from 'n8n-workflow';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type NodeGroupPayload = {
	group: IWorkflowGroup;
};

export type NodeGroupRemovedPayload = {
	id: string;
};

export type NodeGroupsSetPayload = {
	groups: IWorkflowGroup[];
};

export type NodeGroupChangeEvent =
	| ChangeEvent<NodeGroupPayload>
	| ChangeEvent<NodeGroupRemovedPayload>
	| ChangeEvent<NodeGroupsSetPayload>;

type NodeGroupMutationOptions = {
	markDirty?: boolean;
};

export function useWorkflowDocumentNodeGroups() {
	const groups = ref<Map<string, IWorkflowGroup>>(new Map());

	const onNodeGroupsChange = createEventHook<NodeGroupChangeEvent>();
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
		groups.value = new Map(nextGroups.map((group) => [group.id, group]));
		void onNodeGroupsChange.trigger({
			action: CHANGE_ACTION.SET,
			payload: { groups: nextGroups },
		});
	}

	function applyUpsertGroup(
		group: IWorkflowGroup,
		action: ChangeAction,
		{ markDirty = true }: NodeGroupMutationOptions = {},
	) {
		groups.value.set(group.id, group);
		void onNodeGroupsChange.trigger({ action, payload: { group } });
		if (markDirty) {
			void onStateDirty.trigger();
		}
	}

	function applyDeleteGroup(id: string) {
		groups.value.delete(id);
		void onNodeGroupsChange.trigger({
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
		options: NodeGroupMutationOptions = {},
	): IWorkflowGroup {
		const group: IWorkflowGroup = {
			id: window.crypto.randomUUID(),
			nodeIds: [...nodeIds],
			name,
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

	function deleteGroup(id: string) {
		if (!groups.value.has(id)) return;
		applyDeleteGroup(id);
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
		if (!group || !group.nodeIds.includes(previousNodeId)) return;

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
		deleteGroup,
		addNodesToGroup,
		replaceNodeInGroup,
		getGroupById,
		getGroupForNode,
		removeNodeFromGroups,
		clearNodeGroups,
		onNodeGroupsChange: onNodeGroupsChange.on,
		onStateDirty: onStateDirty.on,
	};
}
