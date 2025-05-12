import { watch, computed, ref } from 'vue';
import { isChatNode } from '../../utils';
import { type IExecutionResponse } from '@/Interface';
import { Workflow } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useThrottleFn } from '@vueuse/core';
import {
	createLogEntries,
	deepToRaw,
	type ExecutionLogViewData,
	type LatestNodeInfo,
} from '@/components/RunDataAi/utils';

export function useExecutionData() {
	const nodeHelpers = useNodeHelpers();
	const workflowsStore = useWorkflowsStore();

	const execData = ref<IExecutionResponse | undefined>();

	const workflow = computed(() =>
		execData.value
			? new Workflow({
					...execData.value?.workflowData,
					nodeTypes: workflowsStore.getNodeTypes(),
				})
			: undefined,
	);
	const latestNodeNameById = computed(() =>
		Object.values(workflow.value?.nodes ?? {}).reduce<Record<string, LatestNodeInfo>>(
			(acc, node) => {
				const nodeInStore = workflowsStore.getNodeById(node.id);

				acc[node.id] = {
					deleted: !nodeInStore,
					disabled: nodeInStore?.disabled ?? false,
					name: nodeInStore?.name ?? node.name,
				};
				return acc;
			},
			{},
		),
	);
	const hasChat = computed(() =>
		[Object.values(workflow.value?.nodes ?? {}), workflowsStore.workflow.nodes].some((nodes) =>
			nodes.some(isChatNode),
		),
	);
	const execution = computed<ExecutionLogViewData | undefined>(() => {
		if (!execData.value || !workflow.value) {
			return undefined;
		}

		return {
			...execData.value,
			tree: createLogEntries(workflow.value, execData.value.data?.resultData.runData ?? {}),
		};
	});
	const updateInterval = computed(() => ((execution.value?.tree.length ?? 0) > 10 ? 300 : 0));

	function resetExecutionData() {
		execData.value = undefined;
		workflowsStore.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
	}

	watch(
		// Fields that should trigger update
		[
			() => workflowsStore.workflowExecutionData?.id,
			() => workflowsStore.workflowExecutionData?.workflowData.id,
			() => workflowsStore.workflowExecutionData?.status,
			() => workflowsStore.workflowExecutionResultDataLastUpdate,
		],
		useThrottleFn(
			() => {
				// Create deep copy to disable reactivity
				execData.value = deepToRaw(workflowsStore.workflowExecutionData ?? undefined);
			},
			updateInterval,
			true,
			true,
		),
		{ immediate: true },
	);

	return { execution, workflow, hasChat, latestNodeNameById, resetExecutionData };
}
