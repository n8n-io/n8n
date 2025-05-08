import { watch, computed, ref } from 'vue';
import { isChatNode } from '../../utils';
import { type IExecutionResponse } from '@/Interface';
import { Workflow, type IRunExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useThrottleFn } from '@vueuse/core';
import { IN_PROGRESS_EXECUTION_ID } from '@/constants';
import {
	createLogEntries,
	deepToRaw,
	type LatestNodeInfo,
	type LogEntry,
} from '@/components/RunDataAi/utils';
import { parse } from 'flatted';

export function useExecutionData() {
	const nodeHelpers = useNodeHelpers();
	const workflowsStore = useWorkflowsStore();

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

		return createLogEntries(
			workflow.value,
			execData.value,
			subWorkflows.value,
			subWorkflowExecData.value,
		);
	});
	const updateInterval = computed(() => ((entries.value?.length ?? 0) > 10 ? 300 : 0));
	const runStatusList = computed(() =>
		workflowsStore.workflowExecutionData?.id === IN_PROGRESS_EXECUTION_ID
			? Object.values(workflowsStore.workflowExecutionData?.data?.resultData.runData ?? {})
					.flatMap((tasks) => tasks.map((task) => task.executionStatus ?? ''))
					.join('|')
			: '',
	);

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

		const [subWorkflow, subExecution] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId),
			workflowsStore.fetchExecutionDataById(executionId),
		]);
		const data = subExecution?.data
			? (parse(subExecution.data as unknown as string) as IRunExecutionData)
			: undefined;

		if (data) {
			subWorkflowExecData.value[executionId] = data;
		}

		subWorkflows.value[workflowId] = new Workflow({
			...subWorkflow,
			nodeTypes: workflowsStore.getNodeTypes(),
		});
	}

	watch(
		// Fields that should trigger update
		[
			() => workflowsStore.workflowExecutionData?.id,
			() => workflowsStore.workflowExecutionData?.workflowData.id,
			() => workflowsStore.workflowExecutionData?.status,
			runStatusList,
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

	return {
		execution: execData,
		entries,
		hasChat,
		latestNodeNameById,
		resetExecutionData,
		loadSubExecution,
	};
}
