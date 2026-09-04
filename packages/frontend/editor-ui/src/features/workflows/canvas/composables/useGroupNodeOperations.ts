import { GROUP_NODE_TYPE, getInteriorNodes, isGroupNode } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

import type { INodeUi, XYPosition } from '@/Interface';
import { SetNodeParentCommand } from '@/app/models/history';
import { useHistoryStore } from '@/app/stores/history.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * The edits a group node needs, on the group-node model.
 *
 * A group is a node of type `n8n-nodes-base.group`. Its `name` is the title and
 * its `parameters.objective` is the description. Its members are the nodes that
 * carry its id in `parentId`, so "add to group" and "remove from group" are one
 * field change. A group is empty when no node points at it, which needs no
 * placeholder and no clean-up step.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */
export function useGroupNodeOperations() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const historyStore = useHistoryStore();

	/** Every group node of the workflow. */
	function allGroupNodes(): INodeUi[] {
		return workflowDocumentStore.value.allNodes.filter(isGroupNode);
	}

	function getGroupNode(groupId: string): INodeUi | undefined {
		const node = workflowDocumentStore.value.getNodeById(groupId);
		return node !== undefined && isGroupNode(node) ? node : undefined;
	}

	/** Nodes inside this group. Empty when the group is empty. */
	function getInterior(groupId: string): INodeUi[] {
		return getInteriorNodes(workflowDocumentStore.value.allNodes, groupId);
	}

	/**
	 * True when no node names this group as its parent. Derived, never stored, so
	 * it cannot fall out of step with the nodes.
	 */
	function isGroupEmpty(groupId: string): boolean {
		return getInterior(groupId).length === 0;
	}

	/** The group that holds this node, if any. */
	function getGroupOfNode(nodeId: string): INodeUi | undefined {
		const node = workflowDocumentStore.value.getNodeById(nodeId);
		if (node?.parentId === undefined) return undefined;
		return getGroupNode(node.parentId);
	}

	/** The title shown on the card. */
	function getGroupTitle(groupId: string): string {
		return getGroupNode(groupId)?.name ?? '';
	}

	/** The description shown on the card, from `parameters.objective`. */
	function getGroupObjective(groupId: string): string {
		const objective = getGroupNode(groupId)?.parameters.objective;
		return typeof objective === 'string' ? objective : '';
	}

	/**
	 * A group name no other node uses. The group node lives in `nodes`, so its
	 * name shares the workflow's one namespace.
	 */
	function nextGroupName(baseName: string): string {
		const taken = new Set(workflowDocumentStore.value.allNodes.map((node) => node.name));
		let index = 1;
		while (taken.has(`${baseName} ${index}`)) index += 1;

		return `${baseName} ${index}`;
	}

	/**
	 * Moves a node into a group, or out of one when `groupId` is undefined.
	 *
	 * Records one undo step per node, so a drag out of a group reverts to the
	 * group it came from.
	 */
	function setNodeParent(
		nodeId: string,
		groupId: string | undefined,
		{ trackHistory = true } = {},
	): boolean {
		const node = workflowDocumentStore.value.getNodeById(nodeId);
		if (node === undefined) return false;
		if (node.parentId === groupId) return true;
		// A group cannot hold itself.
		if (groupId === nodeId) return false;

		const previous = node.parentId;
		const updated = workflowDocumentStore.value.updateNodeById(nodeId, { parentId: groupId });
		if (!updated) return false;

		if (trackHistory) {
			historyStore.pushCommandToUndo(
				new SetNodeParentCommand(nodeId, previous, groupId, Date.now()),
			);
		}

		return true;
	}

	/** Moves several nodes into one group as a single undo step. */
	function addNodesToGroup(groupId: string, nodeIds: string[], { trackHistory = true } = {}): void {
		if (getGroupNode(groupId) === undefined) return;

		if (trackHistory) historyStore.startRecordingUndo();
		try {
			for (const nodeId of nodeIds) {
				setNodeParent(nodeId, groupId, { trackHistory });
			}
		} finally {
			if (trackHistory) historyStore.stopRecordingUndo();
		}
	}

	/**
	 * Takes every node out of a group and deletes the group node.
	 *
	 * The nodes and their connections stay. Only the grouping goes.
	 */
	function ungroup(groupId: string, { trackHistory = true } = {}): void {
		const groupNode = getGroupNode(groupId);
		if (groupNode === undefined) return;

		if (trackHistory) historyStore.startRecordingUndo();
		try {
			for (const member of getInterior(groupId)) {
				setNodeParent(member.id, groupNode.parentId, { trackHistory });
			}
			workflowDocumentStore.value.removeNodeById(groupId);
		} finally {
			if (trackHistory) historyStore.stopRecordingUndo();
		}
	}

	/** Sets the description on the card. */
	function setGroupObjective(groupId: string, objective: string): void {
		const groupNode = getGroupNode(groupId);
		if (groupNode === undefined) return;

		workflowDocumentStore.value.setNodeParameters(
			{ name: groupNode.name, value: { ...groupNode.parameters, objective } },
			true,
		);
	}

	/** Reverts a reparent, for the undo history. */
	function revertSetNodeParent(nodeId: string, parentId: string | undefined): void {
		setNodeParent(nodeId, parentId, { trackHistory: false });
	}

	return {
		GROUP_NODE_TYPE,
		allGroupNodes,
		getGroupNode,
		getInterior,
		isGroupEmpty,
		getGroupOfNode,
		getGroupTitle,
		getGroupObjective,
		nextGroupName,
		setNodeParent,
		addNodesToGroup,
		ungroup,
		setGroupObjective,
		revertSetNodeParent,
	};
}

export type GroupNodeOperations = ReturnType<typeof useGroupNodeOperations>;

/** Shape a caller gives to create a group node, before ids are assigned. */
export type NewGroupNode = {
	name: string;
	objective?: string;
	position?: XYPosition;
};

/** The node payload for a new group, for the caller to add through `addNode`. */
export function buildGroupNode(
	group: NewGroupNode,
	id: string,
): Pick<INode, 'id' | 'name' | 'type' | 'typeVersion' | 'parameters'> & { position?: XYPosition } {
	return {
		id,
		name: group.name,
		type: GROUP_NODE_TYPE,
		typeVersion: 1,
		parameters: { objective: group.objective ?? '' },
		...(group.position === undefined ? {} : { position: group.position }),
	};
}
