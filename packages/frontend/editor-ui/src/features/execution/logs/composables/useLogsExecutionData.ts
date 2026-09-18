import { watch, computed, ref, type ComputedRef } from 'vue';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import {
	Workflow,
	type IRunExecutionData,
	type ITaskStartedData,
	type IWorkflowGroup,
	type RelatedExecution,
} from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import {
	copyExecutionData,
	copyRunData,
	createLogTree,
	findSubExecutionLocator,
	liveSubExecutionKey,
	mergeStartData,
} from '@/features/execution/logs/logs.utils';
import { useToast } from '@n8n/composables/useToast';
import type { LatestNodeInfo, LogEntry, LogTreeFilter } from '../logs.types';
import { isChatNode } from '@/app/utils/aiUtils';
import { CHAT_TRIGGER_NODE_TYPE, LOGS_EXECUTION_DATA_THROTTLE_DURATION } from '@/app/constants';
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
	const workflowsListStore = useWorkflowsListStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const currentExecution = computed(() => workflowExecutionStateStore.value.activeExecution);
	const toast = useToast();

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

	// Live sub-executions push their node events as they happen, so their subtree
	// can be shown mid-flight. Kept apart from the lazily-fetched data above,
	// which covers sub-executions that already finished.
	const liveSubExecutionData = ref<Record<string, IRunExecutionData>>({});
	const liveSubWorkflows = ref<Record<string, Workflow>>({});
	const liveSubExecutionLocators = ref<Record<string, RelatedExecution>>({});
	/** Sub-workflows whose graph is being fetched, so we only ask once. */
	const requestedSubWorkflowIds = new Set<string>();

	const subExecutionLinks = computed(() => workflowExecutionStateStore.value.subExecutionLinks);

	/**
	 * Which live sub-executions there are and how fresh each one's data is, as a
	 * single string so it can drive the throttled watcher below. Deliberately not
	 * an array: the watcher compares sources by reference, and a computed handing
	 * back a fresh array would report a change every time it re-evaluated, firing
	 * the throttled update and pushing the real one into the next window.
	 */
	const subExecutionSignature = computed(() =>
		subExecutionLinks.value
			.map(
				(link) =>
					`${link.executionId}@${
						useExecutionDataStore(createExecutionDataId(link.executionId))
							.executionResultDataLastUpdate ?? 0
					}`,
			)
			.join(','),
	);

	/**
	 * Graph of a live sub-workflow. A workflow calling itself already has it on
	 * screen; anything else is fetched once and cached.
	 */
	function resolveLiveSubWorkflow(workflowId: string): Workflow | undefined {
		if (liveSubWorkflows.value[workflowId]) return liveSubWorkflows.value[workflowId];

		if (workflowId === workflowDocumentStore.value.workflowId && workflow.value) {
			return workflow.value;
		}

		if (!requestedSubWorkflowIds.has(workflowId)) {
			requestedSubWorkflowIds.add(workflowId);
			workflowsListStore
				.fetchWorkflow(workflowId)
				.then((fetched) => {
					liveSubWorkflows.value[workflowId] = new Workflow({
						...fetched,
						nodeTypes: nodeTypesStore.getAllNodeTypes(),
					});
					subWorkflowNodeGroups.value[workflowId] ??= fetched.nodeGroups ?? [];
				})
				.catch(() => {
					// Falls back to the on-expand fetch once the sub-execution finishes.
					requestedSubWorkflowIds.delete(workflowId);
				});
		}

		return undefined;
	}

	function snapshotLiveSubExecutions() {
		// Resolving a sub-workflow's graph can cost a request, so skip it while
		// nothing renders the tree.
		if (isEnabled !== undefined && !isEnabled.value) {
			return;
		}

		// Nothing live: leave the refs as they are. Swapping in fresh empty objects
		// would change their identity on every tick and rebuild the whole tree, so a
		// run with no sub-workflow at all would pay for this feature.
		if (subExecutionLinks.value.length === 0) {
			if (Object.keys(liveSubExecutionData.value).length > 0) resetLiveSubExecutions();
			return;
		}

		const data: Record<string, IRunExecutionData> = {};
		const locators: Record<string, RelatedExecution> = {};

		for (const link of subExecutionLinks.value) {
			const subWorkflow = resolveLiveSubWorkflow(link.workflowId);
			if (!subWorkflow) continue;

			// Snapshot, not the store ref: the tree consumes plain, non-reactive data.
			const execution = useExecutionDataStore(
				createExecutionDataId(link.executionId),
			).getExecutionSnapshot();

			liveSubWorkflows.value[link.workflowId] = subWorkflow;
			subWorkflowNodeGroups.value[link.workflowId] ??= execution?.workflowData.nodeGroups ?? [];
			data[link.executionId] = copyRunData(execution?.data);
			locators[
				liveSubExecutionKey(link.parentExecutionId, link.parentNodeName, link.parentNodeRunIndex)
			] = { workflowId: link.workflowId, executionId: link.executionId };
		}

		liveSubExecutionData.value = data;
		liveSubExecutionLocators.value = locators;
	}

	function resetLiveSubExecutions() {
		liveSubExecutionData.value = {};
		liveSubWorkflows.value = {};
		liveSubExecutionLocators.value = {};
		requestedSubWorkflowIds.clear();
	}

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
		const nodeGroups = mergedExecutionData.workflowData.nodeGroups ?? [];

		return createLogTree(
			workflow.value,
			mergedExecutionData,
			{ ...subWorkflows.value, ...liveSubWorkflows.value },
			{ ...subWorkflowExecData.value, ...liveSubExecutionData.value },
			filter?.value,
			nodeGroups,
			subWorkflowNodeGroups.value,
			liveSubExecutionLocators.value,
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

			subWorkflowNodeGroups.value[locator.workflowId] = subExecution.workflowData.nodeGroups ?? [];
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
			subExecutionSignature,
			// Opening the view snapshots what it skipped while closed.
			() => isEnabled?.value,
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
					resetLiveSubExecutions();
				}

				snapshotLiveSubExecutions();
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
