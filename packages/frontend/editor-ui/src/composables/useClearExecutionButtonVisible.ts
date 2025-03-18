import { START_NODE_TYPE } from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCanvasOperations } from './useCanvasOperations';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export function useClearExecutionButtonVisible() {
	const route = useRoute();
	const sourceControlStore = useSourceControlStore();
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionData = computed(() => workflowsStore.workflowExecutionData);
	const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
	const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
	const router = useRouter();
	const { editableWorkflow } = useCanvasOperations({ router });
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
			workflowExecutionData.value,
	);
}
