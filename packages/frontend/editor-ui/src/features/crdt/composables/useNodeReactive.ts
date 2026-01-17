import { shallowRef, triggerRef, onScopeDispose, type ShallowRef } from 'vue';
import type { WorkflowDocument, WorkflowNode } from '../types/workflowDocument.types';

/**
 * Provides a reactive reference to a node that updates when any property changes in CRDT.
 * This includes position, parameters, and handles (inputs/outputs).
 *
 * Uses shallowRef + triggerRef for optimal performance with external state.
 *
 * @param doc - The workflow document
 * @param nodeId - The node ID to watch
 * @returns A shallow ref containing the node data, or undefined if not found
 */
export function useNodeReactive(
	doc: WorkflowDocument,
	nodeId: string,
): ShallowRef<WorkflowNode | undefined> {
	const nodeRef = shallowRef<WorkflowNode | undefined>(undefined);

	// Initialize with current value
	nodeRef.value = doc.findNode(nodeId);

	// Subscribe to position changes
	const unsubPosition = doc.onNodePositionChange(({ nodeId: changedId, position }) => {
		if (changedId === nodeId && nodeRef.value) {
			nodeRef.value = { ...nodeRef.value, position };
			triggerRef(nodeRef);
		}
	});

	// Subscribe to parameter changes
	const unsubParams = doc.onNodeParamsChange(({ nodeId: changedId, params }) => {
		if (changedId === nodeId && nodeRef.value) {
			nodeRef.value = { ...nodeRef.value, parameters: params };
			triggerRef(nodeRef);
		}
	});

	// Subscribe to handle changes (inputs/outputs recomputed by server)
	const unsubHandles = doc.onNodeHandlesChange(({ nodeId: changedId, inputs, outputs }) => {
		if (changedId === nodeId && nodeRef.value) {
			nodeRef.value = { ...nodeRef.value, inputs, outputs };
			triggerRef(nodeRef);
		}
	});

	// Subscribe to node additions (in case node is added after this composable is created)
	const unsubAdded = doc.onNodeAdded((addedNode) => {
		if (addedNode.id === nodeId) {
			nodeRef.value = addedNode;
			triggerRef(nodeRef);
		}
	});

	// Handle node removal
	const unsubRemoved = doc.onNodeRemoved((removedId) => {
		if (removedId === nodeId) {
			nodeRef.value = undefined;
			triggerRef(nodeRef);
		}
	});

	// Cleanup on scope dispose
	onScopeDispose(() => {
		unsubPosition.off();
		unsubParams.off();
		unsubHandles.off();
		unsubAdded.off();
		unsubRemoved.off();
	});

	return nodeRef;
}
