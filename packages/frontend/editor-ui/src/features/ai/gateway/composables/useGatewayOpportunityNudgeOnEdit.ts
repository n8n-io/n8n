import { watch } from 'vue';

import { useAiGateway } from '@/app/composables/useAiGateway';
import { useUIStore } from '@/app/stores/ui.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
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
	const ndvStore = useNDVStore(workflowDocumentStore.value.documentId);

	// Best-effort warm-up. `fetchConfig` caches and shares one in-flight promise,
	// and it is a no-op when Gateway credits is off.
	void aiGateway.fetchConfig().catch(() => {});

	// Watch both: an edit is the trigger, and the node details view suppresses the
	// toast. Closing the view therefore retries an edit that was made inside it.
	watch([() => uiStore.stateIsDirty, () => ndvStore.isNDVOpen], ([isDirty, isNDVOpen]) => {
		// The store caps the nudge for each workflow, so a repeated attempt while
		// the workflow stays dirty costs nothing once the toast has been shown.
		if (!isDirty || isNDVOpen) return;

		const document = workflowDocumentStore.value;
		void maybeShowGatewayOpportunityNudge(document.allNodes, document.workflowId).catch((error) => {
			// A nudge must never disturb editing.
			console.error(error);
		});
	});
}
