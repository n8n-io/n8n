import type { WorkflowMcpAvailabilityChanged } from '@n8n/api-types/push/workflow';
import type { IWorkflowSettings } from '@/Interface';

import { getWorkflow } from '@/app/api/workflows';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

/**
 * Handles the `workflowMcpAvailabilityChanged` push event.
 */
export async function workflowMcpAvailabilityChanged({
	data: { workflowId, availableInMCP },
}: WorkflowMcpAvailabilityChanged) {
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const rootStore = useRootStore();

	// Keep the list entry in sync so other views (workflow cards, MCP
	// settings table) reflect the new state without a full list re-fetch.
	const listEntry = workflowsListStore.workflowsById[workflowId];
	if (listEntry) {
		if (listEntry.settings) {
			listEntry.settings.availableInMCP = availableInMCP;
		} else {
			listEntry.settings = { availableInMCP } as IWorkflowSettings;
		}
	}

	// Only the editor tab needs to resync the document store + checksum.
	if (workflowId !== workflowsStore.workflowId) return;

	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	workflowDocumentStore.mergeSettings({ availableInMCP });

	try {
		// Refresh the expectedChecksum so the next normal save doesn't 409.
		const workflow = await getWorkflow(rootStore.restApiContext, workflowId);
		if (workflow?.checksum) {
			workflowDocumentStore.setChecksum(workflow.checksum);
			if (listEntry) {
				listEntry.checksum = workflow.checksum;
			}
		}
	} catch {
		// A stale checksum will surface as a 409 on the next save
	}
}
