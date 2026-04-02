import { computed, type ShallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { VIEWS } from '@/app/constants';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { getNodesWithNormalizedPosition } from '@/app/utils/nodeViewUtils';
import type { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

export function useWorkflowImport(
	currentWorkflowDocumentStore: ShallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>,
) {
	const route = useRoute();
	const { resetWorkspace, initializeWorkspace, fitView } = useCanvasOperations();
	const workflowsStore = useWorkflowsStore();

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

		if (isDemoRoute.value) {
			// VueFlow drops edges when node handles haven't been created yet
			// ("Edge source or target is missing"). Clear connections so VueFlow only
			// processes nodes first, then re-apply via onNodesInitialized when handles exist.
			workflowsStore.setConnections({});
			canvasEventBus.emit('setConnections:onNodesInit', workflowData.connections);
			canvasEventBus.emit('fitView:onNodesInit');
		} else {
			fitView();
		}
	}

	return { importWorkflowExact };
}
