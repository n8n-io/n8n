import { watch, computed, ref, type ComputedRef } from 'vue';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import {
	Workflow,
	type IRunExecutionData,
	type ITaskStartedData,
	type IWorkflowGroup,
} from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
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
import { CANVAS_NODES_GROUPING_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useThrottleFn } from '@vueuse/core';
import { useThrottleWithReactiveDelay } from '@n8n/composables/useThrottleWithReactiveDelay';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

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
	const nodeTypesStore = useNodeTypesStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const currentExecution = computed(() => workflowExecutionStateStore.value.activeExecution);
	const toast = useToast();
	const posthogStore = usePostHog();
	const isGroupingEnabled = computed(() =>
		posthogStore.isFeatureEnabled(CANVAS_NODES_GROUPING_EXPERIMENT.name),
	);

	const state = ref<
		| { response: IExecutionResponse; startData: { [nodeName: string]: ITaskStartedData[] } }
		| undefined
	>();
	const updateInterval = computed(() =>
		currentExecution.value?.status === 'running' &&
		Object.keys(currentExecution.value.data?.resultData.runData ?? {}).length > 1
			? LOGS_EXECUTION_DATA_THROTTLE_DURATION
			: 0,
	);
	const throttledState = useThrottleWithReactiveDelay(state, updateInterval);
	const throttledWorkflowData = computed(() => throttledState.value?.response.workflowData);

	const subWorkflowExecData = ref<Record<string, IRunExecutionData>>({});
	const subWorkflows = ref<Record<string, Workflow>>({});
	const subWorkflowNodeGroups = ref<Record<string, IWorkflowGroup[]>>({});
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

		// Group membership comes from the execution snapshot so historical executions group too
		const nodeGroups = isGroupingEnabled.value
			? (mergedExecutionData.workflowData.nodeGroups ?? [])
			: [];

		return createLogTree(
			workflow.value,
			mergedExecutionData,
			subWorkflows.value,
			subWorkflowExecData.value,
			filter?.value,
			nodeGroups,
			subWorkflowNodeGroups.value,
		);
	});

	function resetExecutionData() {
		state.value = undefined;
		workflowExecutionStateStore.value.setWorkflowExecutionData(null);
		nodeHelpers.updateNodesExecutionIssues();
		// Clear partial execution destination to allow full workflow execution
		workflowExecutionStateStore.value.setChatPartialExecutionDestinationNode(null);
		void workflowsStore.fetchLastSuccessfulExecution();
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
				nodeTypes: nodeTypesStore.getAllNodeTypes(),
			});

			if (isGroupingEnabled.value) {
				subWorkflowNodeGroups.value[locator.workflowId] =
					subExecution.workflowData.nodeGroups ?? [];
			}
		} catch (e) {
			toast.showError(e, 'Unable to load sub execution');
		}
	}

	watch(
		// Fields that should trigger update
		[
			() => currentExecution.value?.id,
			() => currentExecution.value?.workflowData.id,
			() => currentExecution.value?.status,
			() => workflowExecutionStateStore.value.activeExecutionResultDataLastUpdate,
			() => workflowExecutionStateStore.value.activeExecutionStartedData,
		],
		useThrottleFn(
			([executionId], [previousExecutionId]) => {
				state.value =
					currentExecution.value === null
						? undefined
						: {
								response: copyExecutionData(currentExecution.value),
								startData: workflowExecutionStateStore.value.activeExecutionStartedData?.[1] ?? {},
							};

				if (executionId !== previousExecutionId) {
					// Reset sub workflow data when top-level execution changes
					subWorkflowExecData.value = {};
					subWorkflows.value = {};
					subWorkflowNodeGroups.value = {};
				}
			},
			updateInterval,
			true,
			true,
		),
		{ immediate: true },
	);

	watch(
		() => workflowDocumentStore.value.workflowId,
		() => {
			resetExecutionData();
		},
	);

	// Update workflow object on throttled state changes
	// NOTE: don't turn the workflow object into a computed! It causes infinite update loop
	watch(
		throttledWorkflowData,
		(data) => {
			workflow.value = data
				? new Workflow({ ...data, nodeTypes: nodeTypesStore.getAllNodeTypes() })
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
