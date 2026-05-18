import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

/**
 * Canvas render data accessor for a workflow document.
 *
 * Retrieves the workflow document store for the given id and exposes its
 * per-node input/output port maps. The maps are owned by
 * `useWorkflowDocumentNodes`; this composable is a thin read façade for
 * canvas consumers.
 */
export function useWorkflowDocumentRenderData(workflowDocumentId: WorkflowDocumentId) {
	const store = useWorkflowDocumentStore(workflowDocumentId);

	return {
		nodeInputsByNodeId: store.nodeInputsByNodeId,
		nodeOutputsByNodeId: store.nodeOutputsByNodeId,
	};
}
