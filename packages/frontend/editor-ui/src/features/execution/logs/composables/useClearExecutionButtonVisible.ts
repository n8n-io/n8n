import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

export function useClearExecutionButtonVisible() {
	const route = useRoute();
	const sourceControlStore = useSourceControlStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionStateStore = computed(() =>
		useWorkflowExecutionStateStore(workflowDocumentStore.value.documentId),
	);
	const workflowExecutionData = computed(() => workflowsStore.workflowExecutionData);
	const isWorkflowRunning = computed(() => workflowExecutionStateStore.value.isWorkflowRunning);
	const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
	const nodeTypesStore = useNodeTypesStore();
	const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);
	const allTriggerNodesDisabled = computed(() =>
		workflowDocumentStore.value.allNodes
			.filter((node) => nodeTypesStore.isTriggerNode(node.type))
			.every((node) => node.disabled),
	);

	return computed(
		() =>
			!isReadOnlyRoute.value &&
			!isReadOnlyEnvironment.value &&
			!isWorkflowRunning.value &&
			!allTriggerNodesDisabled.value &&
			!!workflowExecutionData.value,
	);
}
