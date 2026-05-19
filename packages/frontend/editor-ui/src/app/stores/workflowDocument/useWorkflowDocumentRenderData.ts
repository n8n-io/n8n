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
 * `executionIssuesByNodeName` map (resolved via `useWorkflowExecutionStateStore`,
 * which in turn routes through the keyed `useExecutionDataStore`).
 *
 * Call inside a Vue reactive context (e.g. `computed`) — the resolver
 * reads `activeExecutionId` / `displayedExecutionId`, so identity of the
 * returned `executionIssuesByNodeName` map changes when the active or displayed
 * execution swaps and the wrapping computed re-runs.
 */
export function useWorkflowDocumentRenderData(workflowDocumentId: WorkflowDocumentId) {
	const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
	const executionStateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowDocumentStore.workflowId),
	);

	return {
		nodeInputsByNodeId: workflowDocumentStore.nodeInputsByNodeId,
		nodeOutputsByNodeId: workflowDocumentStore.nodeOutputsByNodeId,
		executionIssuesByNodeName: executionStateStore.getActiveExecutionIssuesByNodeName(),
	};
}
