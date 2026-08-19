import type { IWorkflowGroup } from 'n8n-workflow';

import { RemoveNodeGroupCommand } from '@/app/models/history';
import type { useHistoryStore } from '@/app/stores/history.store';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export function snapshotGroup(group: IWorkflowGroup): IWorkflowGroup {
	return { ...group, nodeIds: [...group.nodeIds] };
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
