import { useTelemetry } from '@n8n/composables/useTelemetry';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';

/**
 * Telemetry for canvas selection: capturing when a user selects more than
 * one element (node or group) at once, regardless of whether they go on to
 * act on the selection.
 */
export function useCanvasSelectionTelemetry() {
	const telemetry = useTelemetry();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const rootStore = useRootStore();

	return {
		trackMultipleNodesSelected(nodeIds: string[]) {
			telemetry.track('User selected multiple nodes', {
				workflow_id: workflowDocumentStore.value.workflowId,
				node_ids: nodeIds,
				node_count: nodeIds.length,
				push_ref: rootStore.pushRef,
			});
		},
	};
}
