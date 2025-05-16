import { watch, computed, ref } from 'vue';
import { isChatNode } from '../../utils';
import { type IExecutionResponse } from '@/Interface';
import { Workflow, type IRunExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useThrottleFn } from '@vueuse/core';
import {
	createLogTree,
	deepToRaw,
	mergeStartData,
	type LatestNodeInfo,
	type LogEntry,
} from '@/components/RunDataAi/utils';
import { parse } from 'flatted';
import { useToast } from '@/composables/useToast';

export function useLogsExecutionData() {
	const nodeHelpers = useNodeHelpers();
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();

	const execData = ref<IExecutionResponse | undefined>();
	const subWorkflowExecData = ref<Record<string, IRunExecutionData>>({});
	const subWorkflows = ref<Record<string, Workflow>>({});

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
	const entries = computed<LogEntry[]>(() => {
		if (!execData.value?.data || !workflow.value) {
			return [];
		}

		return createLogTree(
			workflow.value,
			execData.value,
			subWorkflows.value,
			subWorkflowExecData.value,
		);
	});
	const updateInterval = computed(() => ((entries.value?.length ?? 0) > 10 ? 300 : 0));

	function resetExecutionData() {
		execData.value = undefined;
		workflowsStore.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
	}

	async function loadSubExecution(logEntry: LogEntry) {
		const executionId = logEntry.runData.metadata?.subExecution?.executionId;
		const workflowId = logEntry.runData.metadata?.subExecution?.workflowId;

		if (!execData.value?.data || !executionId || !workflowId) {
			return;
		}

		try {
			const subExecution = await workflowsStore.fetchExecutionDataById(executionId);
			const data = subExecution?.data
				? (parse(subExecution.data as unknown as string) as IRunExecutionData)
				: undefined;

			if (!data || !subExecution) {
				throw Error('Data is missing');
			}

			subWorkflowExecData.value[executionId] = data;
			subWorkflows.value[workflowId] = new Workflow({
				...subExecution.workflowData,
				nodeTypes: workflowsStore.getNodeTypes(),
			});
		} catch (e) {
			toast.showError(e, 'Unable to load sub execution');
		}
	}

	watch(
		// Fields that should trigger update
		[
			() => workflowsStore.workflowExecutionData?.id,
			() => workflowsStore.workflowExecutionData?.workflowData.id,
			() => workflowsStore.workflowExecutionData?.status,
			() => workflowsStore.workflowExecutionResultDataLastUpdate,
			() => workflowsStore.workflowExecutionStartedData,
		],
		useThrottleFn(
			([executionId], [previousExecutionId]) => {
				execData.value =
					workflowsStore.workflowExecutionData === null
						? undefined
						: deepToRaw(
								mergeStartData(
									workflowsStore.workflowExecutionStartedData?.[1] ?? {},
									workflowsStore.workflowExecutionData,
								),
							); // Create deep copy to disable reactivity

				if (executionId !== previousExecutionId) {
					// Reset sub workflow data when top-level execution changes
					subWorkflowExecData.value = {};
					subWorkflows.value = {};
				}
			},
			updateInterval,
			true,
			true,
		),
		{ immediate: true },
	);

	return {
		execution: computed(() => execData.value),
		entries,
		hasChat,
		latestNodeNameById,
		resetExecutionData,
		loadSubExecution,
	};
}
