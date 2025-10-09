import { watch, computed, ref, type ComputedRef } from 'vue';
import { type IExecutionResponse } from '@/Interface';
import { Workflow, type IRunExecutionData, type ITaskStartedData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import {
	copyExecutionData,
	createLogTree,
	findSubExecutionLocator,
	mergeStartData,
} from '@/features/logs/logs.utils';
import { parse } from 'flatted';
import { useToast } from '@/composables/useToast';
import type { LatestNodeInfo, LogEntry, LogTreeFilter } from '../logs.types';
import { isChatNode } from '@/utils/aiUtils';
import { LOGS_EXECUTION_DATA_THROTTLE_DURATION, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useThrottleFn } from '@vueuse/core';
import { injectWorkflowState } from '@/composables/useWorkflowState';
import { useThrottleWithReactiveDelay } from '@n8n/composables/useThrottleWithReactiveDelay';

interface UseLogsExecutionDataOptions {
	/**
	 * Enable calculation of log entries. Default: true
	 */
	isEnabled?: ComputedRef<boolean>;
	filter?: ComputedRef<LogTreeFilter>;
}

export function useLogsExecutionData({ isEnabled, filter }: UseLogsExecutionDataOptions = {}) {
	const nodeHelpers = useNodeHelpers();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const toast = useToast();

	const state = ref<
		| { response: IExecutionResponse; startData: { [nodeName: string]: ITaskStartedData[] } }
		| undefined
	>();
	const updateInterval = computed(() =>
		workflowsStore.workflowExecutionData?.status === 'running' &&
		Object.keys(workflowsStore.workflowExecutionData.data?.resultData.runData ?? {}).length > 1
			? LOGS_EXECUTION_DATA_THROTTLE_DURATION
			: 0,
	);
	const throttledState = useThrottleWithReactiveDelay(state, updateInterval);
	const throttledWorkflowData = computed(() => throttledState.value?.response.workflowData);

	const subWorkflowExecData = ref<Record<string, IRunExecutionData>>({});
	const subWorkflows = ref<Record<string, Workflow>>({});
	const workflow = ref<Workflow>();

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
		if ((isEnabled !== undefined && !isEnabled.value) || !throttledState.value || !workflow.value) {
			return [];
		}

		const mergedExecutionData = mergeStartData(
			throttledState.value.startData,
			throttledState.value.response,
		);

		return createLogTree(
			workflow.value,
			mergedExecutionData,
			subWorkflows.value,
			subWorkflowExecData.value,
			filter?.value,
		);
	});

	function resetExecutionData() {
		state.value = undefined;
		workflowState.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
	}

	async function loadSubExecution(logEntry: LogEntry) {
		const locator = findSubExecutionLocator(logEntry);

		if (!state.value || locator === undefined) {
			return;
		}

		try {
			const subExecution = await workflowsStore.fetchExecutionDataById(locator.executionId);
			const data = subExecution?.data
				? (parse(subExecution.data as unknown as string) as IRunExecutionData)
				: undefined;

			if (!data || !subExecution) {
				throw Error('Data is missing');
			}

			subWorkflowExecData.value[locator.executionId] = data;
			subWorkflows.value[locator.workflowId] = new Workflow({
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
				state.value =
					workflowsStore.workflowExecutionData === null
						? undefined
						: {
								response: copyExecutionData(workflowsStore.workflowExecutionData),
								startData: workflowsStore.workflowExecutionStartedData?.[1] ?? {},
							};

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

	watch(
		() => workflowsStore.workflowId,
		(newId) => {
			if (newId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				resetExecutionData();
			}
		},
	);

	// Update workflow object on throttled state changes
	// NOTE: don't turn the workflow object into a computed! It causes infinite update loop
	watch(
		throttledWorkflowData,
		(data) => {
			workflow.value = data
				? new Workflow({ ...data, nodeTypes: workflowsStore.getNodeTypes() })
				: undefined;
		},
		{ immediate: true },
	);

	return {
		execution: computed(() => throttledState.value?.response),
		entries,
		hasChat,
		latestNodeNameById,
		resetExecutionData,
		loadSubExecution,
	};
}
