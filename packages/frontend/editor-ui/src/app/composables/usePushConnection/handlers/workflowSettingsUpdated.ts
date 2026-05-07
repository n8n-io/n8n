import type { ComputedRef } from 'vue';
import type { WorkflowSettingsUpdated } from '@n8n/api-types/push/workflow';
import type { IWorkflowSettings } from '@/Interface';

import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

export async function workflowSettingsUpdated(
	{ data: { workflowId, settings, checksum } }: WorkflowSettingsUpdated,
	options: { workflowId: ComputedRef<string> },
) {
	const workflowsListStore = useWorkflowsListStore();

	// Keep the list entry in sync so other views (workflow cards, MCP
	// settings table) reflect the new state without a full list re-fetch.
	const listEntry = workflowsListStore.workflowsById[workflowId];
	if (listEntry) {
		if (listEntry.settings) {
			Object.assign(listEntry.settings, settings);
		} else {
			listEntry.settings = { ...settings } as IWorkflowSettings;
		}
		if (checksum) {
			listEntry.checksum = checksum;
		}
	}

	// Only the editor tab needs to resync the document store + checksum.
	if (workflowId !== options.workflowId.value) return;

	const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	workflowDocumentStore.mergeSettings(settings);

	if (checksum) {
		// Refresh the expectedChecksum so the next normal save doesn't 409.
		workflowDocumentStore.setChecksum(checksum);
	}
}
