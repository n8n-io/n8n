import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';

import type { IWorkflowSettings, ModalKey } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';

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

		// Only an open document needs the value. A document opened later loads it from the server.
		useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId))?.mergeSettings({
			availableInMCP,
		});
	}
};

// The offer loads lazily: it reaches the MCP store, which the boot chunk does not need.
const mcpExposeAllOffer = {
	isEnabled: () => useExposeAllWorkflowsToMcpStore().isEnabled,
	offer: async (onExposed: () => Promise<void> | void) => {
		const { useExposeAllWorkflowsToMcpOffer } = await import(
			'@/experiments/exposeAllWorkflowsToMcp/composables/useExposeAllWorkflowsToMcpOffer'
		);
		return await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(onExposed);
	},
};

export const registerShellCapabilities = () => {
	capabilityRegistry.provide(capabilities.modalOpeners, modalOpeners);
	capabilityRegistry.provide(capabilities.workflowMcpAccessSync, syncWorkflowMcpAccess);
	capabilityRegistry.provide(capabilities.mcpExposeAllOffer, mcpExposeAllOffer);
};
