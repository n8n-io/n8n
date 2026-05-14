import { inject } from 'vue';
import { useWorkflowDocumentStore, type WorkflowDocumentId } from '../workflowDocument.store';
import { WorkflowRenderDataKey } from '@/app/constants/injectionKeys';

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
		render: {
			nodeInputsByNodeId: store.nodeInputsByNodeId,
			nodeOutputsByNodeId: store.nodeOutputsByNodeId,
		},
	};
}

export type WorkflowRenderData = ReturnType<typeof useWorkflowDocumentRenderData>;

/**
 * Injects the workflow render data from the component tree.
 * Must be used within a component that is a descendant of WorkflowCanvas.
 */
export function injectWorkflowRenderData(): WorkflowRenderData {
	const renderData = inject(WorkflowRenderDataKey);
	if (!renderData) {
		throw new Error(
			'injectWorkflowRenderData(): no render data provided. ' +
				'Ensure this is called within a WorkflowCanvas descendant.',
		);
	}
	return renderData;
}
