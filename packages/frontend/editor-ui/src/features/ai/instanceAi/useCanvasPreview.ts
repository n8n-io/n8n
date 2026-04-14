import { computed, ref, watch, type Ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router';
import type { IconName } from '@n8n/design-system';
import {
	getLatestBuildResult,
	getLatestExecutionId,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
	getExecutionResultsByWorkflow,
	type ExecutionResult,
} from './canvasPreview.utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { useInstanceAiStore } from './instanceAi.store';
import type { ExecutionStatus, WorkflowExecutionState } from './useExecutionPushEvents';

export interface ArtifactTab {
	id: string;
	type: 'workflow' | 'data-table';
	name: string;
	icon: IconName;
	projectId?: string;
	executionStatus?: ExecutionStatus;
}

const ARTIFACT_ICON_MAP: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
};

interface UseCanvasPreviewOptions {
	store: ReturnType<typeof useInstanceAiStore>;
	route: RouteLocationNormalizedLoadedGeneric;
	workflowExecutions?: Ref<Map<string, WorkflowExecutionState>>;
}

export function useCanvasPreview({ store, route, workflowExecutions }: UseCanvasPreviewOptions) {
	const workflowsListStore = useWorkflowsListStore();

	// --- Tab state ---
	const activeTabId = ref<string | null>(null);
	const activeExecutionId = ref<string | null>(null);

	// --- Preview state persistence ---
	const pendingRestore = ref(true);

	function currentThreadId(): string | null {
		const id = route.params.threadId;
		return typeof id === 'string' ? id : store.currentThreadId;
	}

	const debouncedSavePreviewState = useDebounceFn((tabId: string | null) => {
		const threadId = currentThreadId();
		if (!threadId) return;
		void store.updateThreadMetadata(threadId, { activePreviewTab: tabId });
	}, 500);

	// Save activeTabId to thread metadata when it changes (skip during restore)
	watch(activeTabId, (tabId) => {
		if (pendingRestore.value) return;
		void debouncedSavePreviewState(tabId);
	});

	// Execution results extracted from historical chat messages (survives page refresh).
	// Filters out stale executions where the workflow was edited after the execution finished.
	const historicalExecutions = computed(() => {
		const results = new Map<string, ExecutionResult>();
		for (const msg of store.messages) {
			if (!msg.agentTree) continue;
			for (const [wfId, result] of getExecutionResultsByWorkflow(msg.agentTree)) {
				results.set(wfId, result);
			}
		}
		for (const [wfId, result] of results) {
			if (!result.finishedAt) continue;
			const wf = workflowsListStore.getWorkflowById(wfId);
			if (wf?.updatedAt && new Date(wf.updatedAt) > new Date(result.finishedAt)) {
				results.delete(wfId);
			}
		}
		return results;
	});

	// All artifacts (workflows + data tables) in the current thread, derived from resource registry
	const allArtifactTabs = computed((): ArtifactTab[] => {
		const result: ArtifactTab[] = [];
		const liveExecMap = workflowExecutions?.value;
		const historicalExecMap = historicalExecutions.value;
		for (const entry of store.resourceRegistry.values()) {
			if (entry.type === 'workflow' || entry.type === 'data-table') {
				// Live push event state takes priority over historical message data.
				// Historical data already has stale executions filtered out.
				const status =
					entry.type === 'workflow'
						? (liveExecMap?.get(entry.id)?.status ?? historicalExecMap.get(entry.id)?.status)
						: undefined;
				result.push({
					id: entry.id,
					type: entry.type,
					name: entry.name,
					icon: ARTIFACT_ICON_MAP[entry.type] ?? 'file',
					projectId: entry.projectId,
					executionStatus: status,
				});
			}
		}

		return result;
	});

	// Restore activeTabId from thread metadata when artifacts become available
	watch(allArtifactTabs, (tabs) => {
		if (!pendingRestore.value || tabs.length === 0) return;
		pendingRestore.value = false;

		const threadId = currentThreadId();
		if (!threadId) return;

		const metadata = store.getThreadMetadata(threadId);
		const savedTabId = metadata?.activePreviewTab;
		if (typeof savedTabId === 'string' && tabs.some((t) => t.id === savedTabId)) {
			activeTabId.value = savedTabId;
		}
	});

	// Derived preview state from active tab
	const activeWorkflowId = computed(() => {
		const tab = allArtifactTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'workflow' ? tab.id : null;
	});

	const activeDataTableId = computed(() => {
		const tab = allArtifactTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'data-table' ? tab.id : null;
	});

	const activeDataTableProjectId = computed(() => {
		const tab = allArtifactTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'data-table' ? (tab.projectId ?? null) : null;
	});

	const dataTableRefreshKey = ref(0);

	const isPreviewVisible = computed(() => activeTabId.value !== null);

	// Tracks whether the user sent a message in the current thread session.
	// Used to distinguish live operations (should auto-open preview) from
	// historical data being loaded (should not).
	const userSentMessage = ref(false);

	// Tracks whether the canvas was open before the most recent thread switch,
	// so we can restore it when the new thread has a build result.
	const wasCanvasOpenBeforeSwitch = ref(false);

	// --- Actions ---

	function selectTab(tabId: string) {
		activeTabId.value = tabId;
	}

	function closePreview() {
		activeTabId.value = null;
		activeExecutionId.value = null;
	}

	function openWorkflowPreview(workflowId: string) {
		activeTabId.value = workflowId;
	}

	function openDataTablePreview(dataTableId: string, _projectId: string) {
		activeExecutionId.value = null;
		activeTabId.value = dataTableId;
	}

	function markUserSentMessage() {
		userSentMessage.value = true;
	}

	// --- Reset execution view when a new execution starts ---
	// When the AI re-runs a workflow, clear the stale executionId so the iframe
	// switches from showing old execution results to the live workflow view.
	watch(
		() => {
			if (!workflowExecutions || !activeTabId.value) return undefined;
			return workflowExecutions.value.get(activeTabId.value)?.status;
		},
		(status) => {
			if (status === 'running') {
				activeExecutionId.value = null;
			}
		},
	);

	// --- Restore historical execution when tab becomes active ---
	// On page refresh or tab switch, if a workflow tab has a completed execution
	// in the chat history, show its execution results in the iframe.
	// If it doesn't, clear the stale executionId so the iframe shows workflow mode.
	watch(activeTabId, (tabId, oldTabId) => {
		if (!tabId) return;
		// Don't override if a live execution is in progress
		if (workflowExecutions?.value.get(tabId)?.status === 'running') return;
		const historical = historicalExecutions.value.get(tabId);
		if (historical) {
			activeExecutionId.value = historical.executionId;
		} else if (oldTabId) {
			// Only clear when switching between tabs, not on initial open
			activeExecutionId.value = null;
		}
	});

	// --- Guard: fall back if active tab is removed from registry ---
	// Only acts when there ARE tabs but the selected one is missing (i.e. it was removed).
	// Skips when tabs are empty to avoid a race where the registry hasn't been populated yet.

	watch(allArtifactTabs, (tabs) => {
		if (activeTabId.value === null || tabs.length === 0) return;
		const stillExists = tabs.some((t) => t.id === activeTabId.value);
		if (!stillExists) {
			activeTabId.value = tabs[0].id;
		}
	});

	// --- Preserve canvas intent when switching threads ---

	watch(
		() => route.params.threadId,
		() => {
			wasCanvasOpenBeforeSwitch.value = isPreviewVisible.value;
			pendingRestore.value = true;
			activeTabId.value = null;
			activeExecutionId.value = null;
			userSentMessage.value = false;
		},
	);

	// --- Auto-open canvas when AI creates/modifies a workflow ---

	const workflowRefreshKey = ref(0);

	const latestBuildResult = computed(() => {
		for (let i = store.messages.length - 1; i >= 0; i--) {
			const msg = store.messages[i];
			if (msg.agentTree) {
				const result = getLatestBuildResult(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

	// Watch the toolCallId — it changes even when the same workflow is rebuilt.
	// Auto-open logic:
	//   - Preview closed + live build/user message: auto-open to this workflow
	//   - Preview open: switch to this workflow and refresh (workflowRefreshKey++)
	//   - Thread switch with canvas open: restore canvas with new thread's workflow
	//   - Thread switch with canvas closed: stay closed
	watch(
		() => latestBuildResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestBuildResult.value) return;

			const targetId = latestBuildResult.value.workflowId;

			if (
				!isPreviewVisible.value &&
				!store.isStreaming &&
				!userSentMessage.value &&
				!wasCanvasOpenBeforeSwitch.value
			) {
				return;
			}

			// Clear stale execution state for the rebuilt workflow so the tab
			// icon doesn't show a checkmark from a previous execution.
			if (workflowExecutions?.value.has(targetId)) {
				const next = new Map(workflowExecutions.value);
				next.delete(targetId);
				workflowExecutions.value = next;
			}

			wasCanvasOpenBeforeSwitch.value = false;
			activeExecutionId.value = null;
			activeTabId.value = targetId;
			workflowRefreshKey.value++;
		},
	);

	// --- Auto-show execution after run-workflow completes ---

	const latestExecution = computed(() => {
		for (let i = store.messages.length - 1; i >= 0; i--) {
			const msg = store.messages[i];
			if (msg.agentTree) {
				const result = getLatestExecutionId(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

	watch(
		() => latestExecution.value?.executionId,
		() => {
			const exec = latestExecution.value;
			if (!exec) return;

			if (!isPreviewVisible.value && !store.isStreaming && !userSentMessage.value) return;

			activeExecutionId.value = exec.executionId;
			activeTabId.value = exec.workflowId;
			if (!isPreviewVisible.value) {
				workflowRefreshKey.value++;
			}
		},
	);

	// --- Auto-open data table preview when AI creates/modifies a data table ---

	const latestDataTableResult = computed(() => {
		for (let i = store.messages.length - 1; i >= 0; i--) {
			const msg = store.messages[i];
			if (msg.agentTree) {
				const result = getLatestDataTableResult(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

	watch(
		() => latestDataTableResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestDataTableResult.value) return;

			const targetId = latestDataTableResult.value.dataTableId;

			if (
				!isPreviewVisible.value &&
				!store.isStreaming &&
				!userSentMessage.value &&
				!wasCanvasOpenBeforeSwitch.value
			) {
				return;
			}

			wasCanvasOpenBeforeSwitch.value = false;
			activeExecutionId.value = null;
			activeTabId.value = targetId;
			dataTableRefreshKey.value++;
		},
	);

	// --- Close data table preview if the active table is deleted ---

	const latestDeletedDataTableId = computed(() => {
		for (let i = store.messages.length - 1; i >= 0; i--) {
			const msg = store.messages[i];
			if (msg.agentTree) {
				const id = getLatestDeletedDataTableId(msg.agentTree);
				if (id) return id;
			}
		}
		return null;
	});

	watch(latestDeletedDataTableId, (deletedId) => {
		if (deletedId && deletedId === activeTabId.value) {
			const remaining = allArtifactTabs.value.filter((t) => t.id !== deletedId);
			activeTabId.value = remaining.length > 0 ? remaining[0].id : null;
		}
	});

	return {
		activeTabId,
		allArtifactTabs,
		activeWorkflowId,
		activeExecutionId,
		activeDataTableId,
		activeDataTableProjectId,
		dataTableRefreshKey,
		isPreviewVisible,
		userSentMessage,
		workflowRefreshKey,
		selectTab,
		closePreview,
		openWorkflowPreview,
		openDataTablePreview,
		markUserSentMessage,
	};
}
