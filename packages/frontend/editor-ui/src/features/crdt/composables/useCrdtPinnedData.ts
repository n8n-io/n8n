import type { MaybeRef } from 'vue';
import { computed, unref, ref, onScopeDispose } from 'vue';
import type { INodeExecutionData } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { WorkflowDocument } from '../types/workflowDocument.types';

/**
 * CRDT-backed pinned data composable.
 *
 * Provides pinned data operations that work with CRDT WorkflowDocument.
 * Unlike the standard usePinnedData which uses workflows.store (name-keyed),
 * this uses WorkflowDocument methods (ID-keyed in CRDT, auto-converted for sync).
 *
 * @param doc - The WorkflowDocument instance (from useCrdtWorkflowDoc or useRestWorkflowDoc)
 * @param node - The node to get/set pinned data for (reactive ref)
 */
export function useCrdtPinnedData(doc: WorkflowDocument, node: MaybeRef<INodeUi | null>) {
	// Reactive trigger to force recomputation when pinned data changes
	const updateTrigger = ref(0);

	// Subscribe to pinned data changes (both local and remote)
	let unsubHandle: { off: () => void } | undefined;
	if (doc.onPinnedDataChange) {
		unsubHandle = doc.onPinnedDataChange(() => {
			// Increment trigger to force computed to re-evaluate
			updateTrigger.value++;
		});
	}

	// Clean up subscription on scope dispose
	onScopeDispose(() => {
		unsubHandle?.off();
	});

	/**
	 * Get pinned data for the current node (by ID).
	 * Re-evaluates when updateTrigger changes or node changes.
	 */
	const data = computed<INodeExecutionData[] | undefined>(() => {
		// Access trigger to create dependency
		void updateTrigger.value;

		const targetNode = unref(node);
		if (!targetNode) return undefined;
		return doc.getPinnedData?.(targetNode.id);
	});

	/**
	 * Whether the current node has pinned data.
	 */
	const hasData = computed<boolean>(() => {
		return data.value !== undefined && data.value.length > 0;
	});

	/**
	 * Set pinned data for the current node.
	 * @param pinData - The execution data to pin
	 */
	function setData(pinData: INodeExecutionData[]): void {
		const targetNode = unref(node);
		if (!targetNode) return;
		doc.setPinnedData?.(targetNode.id, pinData);
		// Force immediate update for local changes
		updateTrigger.value++;
	}

	/**
	 * Remove pinned data for the current node.
	 */
	function unsetData(): void {
		const targetNode = unref(node);
		if (!targetNode) return;
		doc.removePinnedData?.(targetNode.id);
		// Force immediate update for local changes
		updateTrigger.value++;
	}

	return {
		data,
		hasData,
		setData,
		unsetData,
	};
}
