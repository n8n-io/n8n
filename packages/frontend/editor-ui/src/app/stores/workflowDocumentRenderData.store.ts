import { defineStore, getActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { computed } from 'vue';
import {
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

/**
 * Gets the Pinia store id for a workflow-document-render-data store.
 */
export function getWorkflowDocumentRenderDataStoreId(id: WorkflowDocumentId) {
	return `${STORES.WORKFLOW_DOCUMENT_RENDER_DATA}/${id}`;
}

/**
 * Canvas render data store for a workflow document, keyed by the workflow
 * document id. Pinia deduplicates per store id, so repeated calls with the
 * same `WorkflowDocumentId` resolve to a single instance instead of building
 * a fresh façade object per caller.
 *
 * Thin façade that re-exposes:
 * - the per-node port maps (`nodeInputsByNodeId`, `nodeOutputsByNodeId`)
 *   owned by `useWorkflowDocumentNodes`,
 * - the pin data map (`pinnedDataByNodeName`) owned by
 *   `useWorkflowDocumentPinData`, and
 * - the active execution's `executionIssuesByNodeName` map.
 *
 * Every field resolves through a `computed` because the store setup runs once
 * per document id: the port maps are stable `shallowReactive` containers, but
 * `pinnedDataByNodeName` is a ref whose object identity is replaced on every
 * pin/unpin, and `executionIssuesByNodeName` swaps Map identity when the
 * active/displayed execution changes — capturing them directly at setup time
 * would freeze them.
 */
export function useWorkflowDocumentRenderDataStore(workflowDocumentId: WorkflowDocumentId) {
	return defineStore(getWorkflowDocumentRenderDataStoreId(workflowDocumentId), () => {
		const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
		const executionStateStore = useWorkflowExecutionStateStore(workflowDocumentId);

		return {
			nodeInputsByNodeId: computed(() => workflowDocumentStore.nodeInputsByNodeId),
			nodeOutputsByNodeId: computed(() => workflowDocumentStore.nodeOutputsByNodeId),
			pinnedDataByNodeName: computed(() => workflowDocumentStore.pinnedDataByNodeName),
			executionIssuesByNodeName: computed(
				() => executionStateStore.activeExecutionIssuesByNodeName,
			),
		};
	})();
}

export type WorkflowDocumentRenderDataStore = ReturnType<typeof useWorkflowDocumentRenderDataStore>;

/**
 * Disposes a workflow-document-render-data store. Call wherever the
 * underlying workflow-document or workflow-execution-state store for the same
 * document id is disposed — a surviving render-data store would keep
 * resolving through the disposed instances, whose computeds no longer update.
 * Mirrors `disposeWorkflowDocumentStore`.
 */
export function disposeWorkflowDocumentRenderDataStore(store: WorkflowDocumentRenderDataStore) {
	const pinia = getActivePinia();
	store.$dispose();

	if (pinia) {
		delete pinia.state.value[store.$id];
	}
}
