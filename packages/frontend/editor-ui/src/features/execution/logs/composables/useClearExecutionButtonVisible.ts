import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getActiveExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowExecutionSessionStore } from '@/app/stores/workflowExecutionSession.store';
import { computed } from 'vue';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export function useClearExecutionButtonVisible() {
	const route = useRoute();
	const sourceControlStore = useSourceControlStore();
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionSessionStore = computed(() =>
		useWorkflowExecutionSessionStore(workflowsStore.workflowId),
	);
	const execution = computed(
		() => getActiveExecutionDataStore(workflowExecutionSessionStore.value)?.execution,
	);
	const isWorkflowRunning = computed(() => workflowExecutionSessionStore.value.isWorkflowRunning);
	const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
	const { editableWorkflow } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);
	const allTriggerNodesDisabled = computed(() =>
		editableWorkflow.value.nodes
			.filter((node) => nodeTypesStore.isTriggerNode(node.type))
			.every((node) => node.disabled),
	);

	return computed(
		() =>
			!isReadOnlyRoute.value &&
			!isReadOnlyEnvironment.value &&
			!isWorkflowRunning.value &&
			!allTriggerNodesDisabled.value &&
			!!execution.value,
	);
}
