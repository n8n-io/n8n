import { useWorkflowDocumentStore, type WorkflowDocumentId } from '../workflowDocument.store';
import { WorkflowRenderDataKey } from '@/app/constants/injectionKeys';
import { injectStrict } from '@/app/utils/injectStrict';

/**
 * Canvas-level render data composable. Provides per-node port data
 * (inputs/outputs) to canvas components via provide/inject.
 *
 * Instantiated once in WorkflowCanvas.vue and provided to the tree.
 * The actual port computation lives in useWorkflowDocumentNodes —
 * this composable is a thin accessor that reads from the store.
 */
export function useWorkflowDocumentRenderData(id: WorkflowDocumentId) {
	const store = useWorkflowDocumentStore(id);

	return {
		nodeInputsByNodeId: store.nodeInputsByNodeId,
		nodeOutputsByNodeId: store.nodeOutputsByNodeId,
	};
}

export type WorkflowRenderData = ReturnType<typeof useWorkflowDocumentRenderData>;

/**
 * Injects the workflow render data from the component tree.
 * Throws if no render data is provided — every canvas must have
 * an ancestor that provides WorkflowRenderDataKey.
 */
export function injectWorkflowRenderData(): WorkflowRenderData {
	return injectStrict(WorkflowRenderDataKey);
}
