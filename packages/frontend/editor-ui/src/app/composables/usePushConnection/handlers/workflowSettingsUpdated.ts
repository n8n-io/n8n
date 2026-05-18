import type { WorkflowSettingsUpdated } from '@n8n/api-types/push/workflow';
import type { IWorkflowSettings } from '@/Interface';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

export function useWorkflowSettingsUpdated() {
	const workflowsListStore = useWorkflowsListStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	async function workflowSettingsUpdated({
		data: { workflowId, settings, checksum },
	}: WorkflowSettingsUpdated) {
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
		if (workflowId !== workflowDocumentStore.value.workflowId) return;

		workflowDocumentStore.value.mergeSettings(settings);

		if (checksum) {
			// Refresh the expectedChecksum so the next normal save doesn't 409.
			workflowDocumentStore.value.setChecksum(checksum);
		}
	}

	return { workflowSettingsUpdated };
}
