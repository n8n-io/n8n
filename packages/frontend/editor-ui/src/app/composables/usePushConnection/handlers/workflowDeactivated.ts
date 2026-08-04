import type { WorkflowDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import type { PushHandlerOptions } from './types';

export async function workflowDeactivated(
	{ data }: WorkflowDeactivated,
	{ documentId }: PushHandlerOptions,
) {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowsListStore = useWorkflowsListStore();
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const uiStore = useUIStore();

	if (workflowDocumentStore.workflowId === data.workflowId) {
		// The workflow is no longer published; clear any lingering publication
		// lifecycle state so the button doesn't stay stuck on partial/failed/publishing.
		if (useSettingsStore().isWorkflowPublicationServiceEnabled) {
			workflowDocumentStore.setPublicationStatus({ status: 'idle' });
		}

		const updatedWorkflow = await workflowsListStore.fetchWorkflow(data.workflowId);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to fetch workflow');
		}

		if (uiStore.stateIsDirty) {
			// Unsaved changes in the editor: reflect the deactivation locally and refresh the
			// expectedChecksum so the next save doesn't 409, but don't re-hydrate — that would
			// discard the in-progress edits.
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
		} else {
			// initializeWorkspace calls initState which sets the document store
			await initializeWorkspace(updatedWorkflow);
		}
	}
}
