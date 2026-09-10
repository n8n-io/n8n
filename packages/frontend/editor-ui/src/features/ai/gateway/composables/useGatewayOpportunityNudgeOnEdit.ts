import { watch } from 'vue';

import { useAiGateway } from '@/app/composables/useAiGateway';
import { useUIStore } from '@/app/stores/ui.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { maybeShowGatewayOpportunityNudge } from './useGatewayOpportunityNudge';

/**
 * Shows the Gateway credits nudge the first time the user edits a workflow.
 *
 * A manual run is too narrow a trigger on its own: a workflow on a schedule or
 * a webhook may never get one in the editor. An edit says the user works on
 * this workflow, unlike opening it, which is often only a look.
 *
 * The gateway config loads when the workflow opens, so the scan that follows
 * the first edit is synchronous and the toast appears at once.
 */
export function useGatewayOpportunityNudgeOnEdit(): void {
	const uiStore = useUIStore();
	const aiGateway = useAiGateway();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	// Best-effort warm-up. `fetchConfig` caches and shares one in-flight promise,
	// and it is a no-op when Gateway credits is off.
	void aiGateway.fetchConfig().catch(() => {});

	watch(
		() => uiStore.stateIsDirty,
		(isDirty) => {
			// Only the clean-to-dirty edge, so one edit gives one attempt. Autosave
			// clears the flag, and the store caps the nudge for each workflow.
			if (!isDirty) return;

			const document = workflowDocumentStore.value;
			void maybeShowGatewayOpportunityNudge(document.allNodes, document.workflowId).catch(
				(error) => {
					// A nudge must never disturb editing.
					console.error(error);
				},
			);
		},
	);
}
