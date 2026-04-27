import { watch, computed, ref, type ComputedRef } from 'vue';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { Workflow, type IRunExecutionData, type ITaskStartedData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { getActiveExecutionDataStore } from '@/app/stores/executionData.store';
import { useWorkflowExecutionSessionStore } from '@/app/stores/workflowExecutionSession.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import {
	copyExecutionData,
	createLogTree,
	findSubExecutionLocator,
	mergeStartData,
} from '@/features/execution/logs/logs.utils';
import { useToast } from '@/app/composables/useToast';
import type { LatestNodeInfo, LogEntry, LogTreeFilter } from '../logs.types';
import { isChatNode } from '@/app/utils/aiUtils';
import { CHAT_TRIGGER_NODE_TYPE, LOGS_EXECUTION_DATA_THROTTLE_DURATION } from '@/app/constants';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useThrottleFn } from '@vueuse/core';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
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
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const workflowExecutionSessionStore = computed(() =>
		useWorkflowExecutionSessionStore(workflowsStore.workflowId),
	);
	const executionDataStore = computed(() =>
		getActiveExecutionDataStore(workflowExecutionSessionStore.value),
	);
	const workflowState = injectWorkflowState();
	const toast = useToast();

	const state = ref<
		| { response: IExecutionResponse; startData: { [nodeName: string]: ITaskStartedData[] } }
		| undefined
	>();
	const updateInterval = computed(() =>
		executionDataStore.value?.execution?.status === 'running' &&
		Object.keys(executionDataStore.value.execution.data?.resultData.runData ?? {}).length > 1
			? LOGS_EXECUTION_DATA_THROTTLE_DURATION
			: 0,
	);
	const throttledState = useThrottleWithReactiveDelay(state, updateInterval);

	const subWorkflowExecData = ref<Record<string, IRunExecutionData>>({});
	const subWorkflows = ref<Record<string, Workflow>>({});
	const workflow = ref<Workflow>();

	const latestNodeNameById = computed(() =>
		Object.values(workflow.value?.nodes ?? {}).reduce<Record<string, LatestNodeInfo>>(
			(acc, node) => {
				const nodeInStore = workflowDocumentStore.value.getNodeById(node.id) ?? null;

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
	const chatHubPanelStore = useChatHubPanelStore();
	const hasChat = computed(() => {
		// When the floating chat panel experiment is enabled and the ChatTrigger has
		// availableInChat enabled, the floating chat hub handles chat instead of the bottom panel
		if (chatHubPanelStore.isFloatingChatEnabled) {
			const isChatHubActive = workflowDocumentStore.value.allNodes.some(
				(node) => node.type === CHAT_TRIGGER_NODE_TYPE && node.parameters?.availableInChat === true,
			);
			if (isChatHubActive) return false;
		}

		return [Object.values(workflow.value?.nodes ?? {}), workflowDocumentStore.value.allNodes].some(
			(nodes) => nodes.some(isChatNode),
		);
	});

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
		workflowState.setExecution(null);
		nodeHelpers.updateNodesExecutionIssues();
		// Clear partial execution destination to allow full workflow execution
		workflowExecutionSessionStore.value.setChatPartialExecutionDestinationNode(null);
		void workflowState.fetchLastSuccessfulExecution();
	}

	async function loadSubExecution(logEntry: LogEntry) {
		const locator = findSubExecutionLocator(logEntry);

		if (!state.value || locator === undefined) {
			return;
		}

		try {
			const subExecution = await workflowsStore.fetchExecutionDataById(locator.executionId);
			const data = subExecution?.data ?? undefined;

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
			() => executionDataStore.value?.execution?.id,
			() => executionDataStore.value?.execution?.workflowData.id,
			() => executionDataStore.value?.execution?.status,
			() => executionDataStore.value?.executionResultDataLastUpdate,
			() => executionDataStore.value?.executionStartedData,
		],
		useThrottleFn(
			([executionId], [previousExecutionId]) => {
				state.value = !executionDataStore.value?.execution
					? undefined
					: {
							response: copyExecutionData(executionDataStore.value?.execution),
							startData: executionDataStore.value?.executionStartedData?.[1] ?? {},
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
		() => {
			resetExecutionData();
		},
	);

	// Update workflow object on throttled state changes
	// NOTE: don't turn the workflow object into a computed! It causes infinite update loop
	watch(
		throttledState,
		(nextState) => {
			workflow.value = nextState?.response.workflowData
				? new Workflow({
						...nextState.response.workflowData,
						nodeTypes: workflowsStore.getNodeTypes(),
					})
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
