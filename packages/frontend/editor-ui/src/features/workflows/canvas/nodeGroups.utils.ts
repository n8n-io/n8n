import type { IWorkflowGroup } from 'n8n-workflow';

import { RemoveNodeGroupCommand } from '@/app/models/history';
import type { useHistoryStore } from '@/app/stores/history.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export function snapshotGroup(group: IWorkflowGroup): IWorkflowGroup {
	return { ...group, nodeIds: [...group.nodeIds] };
}

/** Ids of the groups that hold a trigger, so the canvas can mark them. */
export function findGroupIdsWithTrigger(
	groups: IWorkflowGroup[],
	getNodeById: (nodeId: string) => { type: string } | undefined,
	isTriggerNode: (nodeType: string) => boolean,
): Set<string> {
	const groupsWithTrigger = groups.filter((group) =>
		group.nodeIds.some((nodeId) => {
			const node = getNodeById(nodeId);
			return node ? isTriggerNode(node.type) : false;
		}),
	);

	return new Set(groupsWithTrigger.map((group) => group.id));
}

/**
 * Deletes a group and pushes an undo command that restores it.
 * Snapshots the group at call time, so callers pass the group whose current
 * state should be restored (e.g. a state captured before node replacements).
 */
export function deleteGroupWithHistory(
	group: IWorkflowGroup,
	workflowDocumentStore: WorkflowDocumentStore,
	historyStore: ReturnType<typeof useHistoryStore>,
) {
	const snapshot = snapshotGroup(group);
	workflowDocumentStore.deleteGroup(group.id);
	historyStore.pushCommandToUndo(new RemoveNodeGroupCommand(snapshot, Date.now()));
}
