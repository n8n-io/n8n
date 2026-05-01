import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { computed } from 'vue';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowId } from '@/app/composables/useWorkflowId';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';

export function useClearExecutionButtonVisible() {
	const route = useRoute();
	const sourceControlStore = useSourceControlStore();
	const workflowId = useWorkflowId();
	const workflowExecutionSession = computed(() =>
		useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId(workflowId.value)),
	);
	const workflowExecutionData = computed(() => workflowExecutionSession.value.activeExecution);
	const isWorkflowRunning = computed(() => workflowExecutionSession.value.isWorkflowRunning);
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
			!!workflowExecutionData.value,
	);
}
