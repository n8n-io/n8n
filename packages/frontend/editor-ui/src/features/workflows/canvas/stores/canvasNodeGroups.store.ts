import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export const CANVAS_NODE_GROUPS_STORE_ID = 'canvasNodeGroups';

export type CanvasNodeGroup = {
	id: string;
	nodeIds: string[];
	title: string;
};

const MIN_GROUP_SIZE = 2;

export const useCanvasNodeGroupsStore = defineStore(CANVAS_NODE_GROUPS_STORE_ID, () => {
	const groups = ref<Map<string, CanvasNodeGroup>>(new Map());

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

	function createGroup(nodeIds: string[], title: string): CanvasNodeGroup {
		const group: CanvasNodeGroup = {
			id: uuidv4(),
			nodeIds: [...nodeIds],
			title,
		};
		groups.value.set(group.id, group);
		return group;
	}

	function getNextDefaultTitle(baseTitle: string) {
		const titles = new Set(allGroups.value.map((group) => group.title));
		let index = 1;
		let title = `${baseTitle} ${index}`;

		while (titles.has(title)) {
			index++;
			title = `${baseTitle} ${index}`;
		}

		return title;
	}

	function updateTitle(id: string, title: string) {
		const group = groups.value.get(id);
		if (!group) return;
		if (group.title === title) return;
		group.title = title;
	}

	function deleteGroup(id: string) {
		groups.value.delete(id);
	}

	function addNodesToGroup(id: string, nodeIds: string[]) {
		const group = groups.value.get(id);
		if (!group) return;

		const existing = new Set(group.nodeIds);
		const added = nodeIds.filter((nodeId) => !existing.has(nodeId));
		if (added.length === 0) return;

		group.nodeIds = [...group.nodeIds, ...added];
	}

	function getGroupById(id: string): CanvasNodeGroup | undefined {
		return groups.value.get(id);
	}

	function getGroupForNode(nodeId: string): CanvasNodeGroup | undefined {
		const groupId = nodeIdToGroupId.value.get(nodeId);
		return groupId ? groups.value.get(groupId) : undefined;
	}

	function pruneNodes(currentNodeIds: Set<string>) {
		const toDelete: string[] = [];
		for (const group of groups.value.values()) {
			const remaining = group.nodeIds.filter((id) => currentNodeIds.has(id));
			if (remaining.length === group.nodeIds.length) continue;

			if (remaining.length < MIN_GROUP_SIZE) {
				toDelete.push(group.id);
			} else {
				group.nodeIds = remaining;
			}
		}
		for (const id of toDelete) {
			groups.value.delete(id);
		}
	}

	function clear() {
		groups.value = new Map();
	}

	return {
		allGroups,
		createGroup,
		getNextDefaultTitle,
		updateTitle,
		deleteGroup,
		addNodesToGroup,
		getGroupById,
		getGroupForNode,
		pruneNodes,
		clear,
	};
});
