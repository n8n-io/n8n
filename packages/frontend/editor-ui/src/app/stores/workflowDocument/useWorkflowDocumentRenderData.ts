import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

/**
 * Canvas render data accessor for a workflow document.
 *
 * Thin façade that re-exposes:
 * - the per-node port maps (`nodeInputsByNodeId`, `nodeOutputsByNodeId`)
 *   owned by `useWorkflowDocumentNodes`,
 * - the pin data map (`pinnedDataByNodeName`) owned by
 *   `useWorkflowDocumentPinData`, and
 * - the active execution's `executionIssuesByNodeName` map.
 *
 * Reactivity is owned by the underlying stores: the port maps are stable
 * references on the workflow document store, `pinnedDataByNodeName` is a
 * `shallowReactive` with per-key reactivity, and `executionIssuesByNodeName`
 * resolves through a `computed` on the workflow execution state store that
 * swaps between the active and displayed execution's per-execution maps.
 */
export function useWorkflowDocumentRenderData(workflowDocumentId: WorkflowDocumentId) {
	const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
	const executionStateStore = useWorkflowExecutionStateStore(workflowDocumentId);

	return {
		nodeInputsByNodeId: workflowDocumentStore.nodeInputsByNodeId,
		nodeOutputsByNodeId: workflowDocumentStore.nodeOutputsByNodeId,
		pinnedDataByNodeName: workflowDocumentStore.pinnedDataByNodeName,
		executionIssuesByNodeName: executionStateStore.activeExecutionIssuesByNodeName,
	};
}
