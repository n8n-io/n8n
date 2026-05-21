import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	useWorkflowExecutionStateStore,
	createWorkflowExecutionStateId,
} from '@/app/stores/workflowExecutionState.store';

/**
 * Canvas render data accessor for a workflow document.
 *
 * Thin façade that re-exposes the per-node port maps owned by
 * `useWorkflowDocumentNodes` and the active execution's per-node-name
 * `executionIssuesByNodeName` map. Reactivity is owned by the underlying
 * stores: the port maps are stable references on the workflow document
 * store, and `executionIssuesByNodeName` resolves through a `computed`
 * on the workflow execution state store that swaps between the active
 * and displayed execution's per-execution maps.
 */
export function useWorkflowDocumentRenderData(workflowDocumentId: WorkflowDocumentId) {
	const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
	const executionStateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowDocumentStore.workflowId),
	);

	return {
		nodeInputsByNodeId: workflowDocumentStore.nodeInputsByNodeId,
		nodeOutputsByNodeId: workflowDocumentStore.nodeOutputsByNodeId,
		executionIssuesByNodeName: executionStateStore.activeExecutionIssuesByNodeName,
	};
}
