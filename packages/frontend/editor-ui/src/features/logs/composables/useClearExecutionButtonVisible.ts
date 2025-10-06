import { START_NODE_TYPE } from '@/constants';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export function useClearExecutionButtonVisible() {
	const route = useRoute();
	const sourceControlStore = useSourceControlStore();
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionData = computed(() => workflowsStore.workflowExecutionData);
	const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
	const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
	const { editableWorkflow } = useCanvasOperations();
	const nodeTypesStore = useNodeTypesStore();
	const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);
	const allTriggerNodesDisabled = computed(() =>
		editableWorkflow.value.nodes
			.filter((node) => node.type === START_NODE_TYPE || nodeTypesStore.isTriggerNode(node.type))
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
