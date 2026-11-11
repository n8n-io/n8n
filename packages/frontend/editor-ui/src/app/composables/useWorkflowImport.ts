import { computed, type ShallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { VIEWS } from '@/app/constants';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { getNodesWithNormalizedPosition } from '@/app/utils/nodeViewUtils';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { isCredentialOnlyNodeType } from '@/app/utils/credentialOnlyNodes';
import type { INode } from 'n8n-workflow';

function hasCredentialOnlyNodes(nodes: INode[]) {
	return nodes.some((node) => !!node.extendsCredential || isCredentialOnlyNodeType(node.type));
}

export function useWorkflowImport(
	currentWorkflowDocumentStore: ShallowRef<WorkflowDocumentStore | null>,
) {
	const route = useRoute();
	const credentialsStore = useCredentialsStore();
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

		// Credential-only nodes resolve their node type from the credential types.
		// Preview instances do not load credential types on startup, so load them here.
		if (hasCredentialOnlyNodes(workflowData.nodes)) {
			try {
				await credentialsStore.fetchCredentialTypes(false);
			} catch (error) {
				console.error('Failed to load credential types for workflow import', error);
			}
		}

		resetWorkspace();

		const { workflowDocumentStore } = await initializeWorkspace({
			...workflowData,
			nodes: getNodesWithNormalizedPosition<INodeUi>(workflowData.nodes),
		} as IWorkflowDb);

		currentWorkflowDocumentStore.value = workflowDocumentStore;

		if (isDemoRoute.value) {
			// VueFlow drops edges when node handles haven't been created yet
			// ("Edge source or target is missing"). Clear connections so VueFlow only
			// processes nodes first, then re-apply via onNodesInitialized when handles exist.
			workflowDocumentStore.setConnections({});
			canvasEventBus.emit('setConnections:onNodesInit', workflowData.connections);
			canvasEventBus.emit('fitView:onNodesInit');
		} else {
			fitView();
		}
	}

	return { importWorkflowExact };
}
