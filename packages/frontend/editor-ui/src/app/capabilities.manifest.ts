import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';

import type { IWorkflowSettings, ModalKey } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

/**
 * Shell actions that a module calls but cannot import — the counterpart to
 * `componentSlots.manifest.ts` for the `capabilityRegistry`.
 *
 * Module-level, so a replayed registration provides the same identity and the
 * registry stays silent. Each method reads the store when it is called: this
 * file is evaluated before `app.use(pinia)`.
 */
const modalOpeners = {
	openModal: (name: ModalKey) => useUIStore().openModal(name),
	openModalWithData: (payload: { name: ModalKey; data: Record<string, unknown> }) =>
		useUIStore().openModalWithData(payload),
};

const syncWorkflowMcpAccess = (workflowIds: string[], availableInMCP: boolean) => {
	const workflowsListStore = useWorkflowsListStore();

	for (const workflowId of workflowIds) {
		const existing = workflowsListStore.workflowsById[workflowId];
		if (existing) {
			if (existing.settings) {
				existing.settings.availableInMCP = availableInMCP;
			} else {
				existing.settings = { availableInMCP } as IWorkflowSettings;
			}
		}

		useWorkflowDocumentStore(createWorkflowDocumentId(workflowId)).mergeSettings({
			availableInMCP,
		});
	}
};

export const registerShellCapabilities = () => {
	capabilityRegistry.provide(capabilities.modalOpeners, modalOpeners);
	capabilityRegistry.provide(capabilities.workflowMcpAccessSync, syncWorkflowMcpAccess);
};
