import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

/**
 * Shows here that the move turned off the workflow. The server tells the other open editors, but
 * not this tab, because this tab holds the write lock. The turn-off also changes the checksum of
 * the workflow, so the open editor reads it again: the next save would fail with the old one.
 */
export async function syncLocalTurnOff(workflowId: string): Promise<void> {
	const workflowsStore = useWorkflowsStore();
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	workflowsStore.setWorkflowInactive(workflowId);
	documentStore.setActiveState({ activeVersionId: null, activeVersion: null });
	if (workflowsStore.workflowId !== workflowId) return;

	try {
		const saved = await useWorkflowsListStore().fetchWorkflow(workflowId);
		documentStore.setChecksum(saved.checksum ?? '');
		documentStore.setVersionData({
			versionId: saved.versionId,
			name: documentStore.versionData?.name ?? null,
			description: documentStore.versionData?.description ?? null,
		});
	} catch {
		// The move and the turn-off worked. A save with the old checksum shows the conflict
		// dialog, which reloads the workflow.
	}
}
