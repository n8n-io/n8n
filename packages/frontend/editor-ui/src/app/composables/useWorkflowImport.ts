import { computed, type ShallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { VIEWS } from '@/app/constants';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { getNodesWithNormalizedPosition } from '@/app/utils/nodeViewUtils';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

export function useWorkflowImport(
	currentWorkflowDocumentStore: ShallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>,
) {
	const route = useRoute();
	const { resetWorkspace, initializeWorkspace, fitView } = useCanvasOperations();

	const isDemoRoute = computed(() => route.name === VIEWS.DEMO);

	async function importWorkflowExact({
		workflow: workflowData,
	}: {
		workflow: WorkflowDataUpdate;
	}) {
		if (!workflowData.nodes || !workflowData.connections) {
			throw new Error('Invalid workflow object');
		}

		resetWorkspace();

		const { workflowDocumentStore } = await initializeWorkspace({
			...workflowData,
			id: isDemoRoute.value ? 'demo' : workflowData.id,
			nodes: getNodesWithNormalizedPosition<INodeUi>(workflowData.nodes),
		} as IWorkflowDb);

		currentWorkflowDocumentStore.value = workflowDocumentStore;

		// In iframe context, defer fitView until VueFlow has measured the new nodes
		// (onNodesInitialized). Immediate fitView fires before dimensions are known.
		if (isDemoRoute.value) {
			canvasEventBus.emit('fitView:onNodesInit');
		} else {
			fitView();
		}
	}

	return { importWorkflowExact };
}
