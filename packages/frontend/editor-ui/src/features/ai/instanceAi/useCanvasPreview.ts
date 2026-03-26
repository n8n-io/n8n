import { computed, ref, watch } from 'vue';
import type { RouteLocationNormalizedLoadedGeneric } from 'vue-router';
import {
	getLatestBuildResult,
	getLatestExecutionId,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
} from './canvasPreview.utils';
import type { useInstanceAiStore } from './instanceAi.store';

interface UseCanvasPreviewOptions {
	store: ReturnType<typeof useInstanceAiStore>;
	route: RouteLocationNormalizedLoadedGeneric;
}

export function useCanvasPreview({ store, route }: UseCanvasPreviewOptions) {
	// --- Canvas preview state ---
	const activeWorkflowId = ref<string | null>(null);
	const activeExecutionId = ref<string | null>(null);
	const iframePushRef = ref<string | null>(null);

	// --- Data table preview state ---
	const activeDataTableId = ref<string | null>(null);
	const activeDataTableProjectId = ref<string | null>(null);
	const dataTableRefreshKey = ref(0);

	const isPreviewVisible = computed(
		() => activeWorkflowId.value !== null || activeDataTableId.value !== null,
	);

	// Tracks whether the user sent a message in the current thread session.
	// Used to distinguish live operations (should auto-open preview) from
	// historical data being loaded (should not).
	const userSentMessage = ref(false);

	// Tracks whether the canvas was open before the most recent thread switch,
	// so we can restore it when the new thread has a build result.
	const wasCanvasOpenBeforeSwitch = ref(false);

	// --- Actions ---

	function openWorkflowPreview(workflowId: string) {
		activeDataTableId.value = null;
		activeDataTableProjectId.value = null;
		activeWorkflowId.value = workflowId;
	}

	function openDataTablePreview(dataTableId: string, projectId: string) {
		activeWorkflowId.value = null;
		activeExecutionId.value = null;
		activeDataTableId.value = dataTableId;
		activeDataTableProjectId.value = projectId;
	}

	function markUserSentMessage() {
		userSentMessage.value = true;
	}

	// --- Preserve canvas intent when switching threads ---

	watch(
		() => route.params.threadId,
		() => {
			wasCanvasOpenBeforeSwitch.value = isPreviewVisible.value;
			activeWorkflowId.value = null;
			activeExecutionId.value = null;
			activeDataTableId.value = null;
			activeDataTableProjectId.value = null;
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
	//   - Live build (isStreaming): always auto-open
	//   - Thread switch with canvas open: restore canvas with new thread's workflow
	//   - Thread switch with canvas closed: stay closed
	watch(
		() => latestBuildResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestBuildResult.value) return;

			// If a panel is already open, don't auto-switch to a different artifact
			if (isPreviewVisible.value) return;

			if (!store.isStreaming && !userSentMessage.value && !wasCanvasOpenBeforeSwitch.value) {
				return;
			}

			wasCanvasOpenBeforeSwitch.value = false;
			activeDataTableId.value = null;
			activeDataTableProjectId.value = null;
			activeExecutionId.value = null;
			activeWorkflowId.value = latestBuildResult.value.workflowId;
			workflowRefreshKey.value++;
		},
	);

	// --- Auto-show execution after run-workflow completes ---

	const latestExecutionId = computed(() => {
		for (let i = store.messages.length - 1; i >= 0; i--) {
			const msg = store.messages[i];
			if (msg.agentTree) {
				const execId = getLatestExecutionId(msg.agentTree);
				if (execId) return execId;
			}
		}
		return null;
	});

	watch(latestExecutionId, (execId) => {
		if (!execId) return;

		// If a panel is already open, don't auto-switch to a different artifact
		if (isPreviewVisible.value) return;

		if (!store.isStreaming && !userSentMessage.value) return;

		activeDataTableId.value = null;
		activeDataTableProjectId.value = null;
		activeExecutionId.value = execId;

		// Open the canvas if it's not visible yet (e.g. user closed it, then asked to re-execute)
		if (!isPreviewVisible.value && latestBuildResult.value) {
			activeWorkflowId.value = latestBuildResult.value.workflowId;
			workflowRefreshKey.value++;
		}
	});

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

			// If a panel is already open, don't auto-switch to a different artifact
			if (isPreviewVisible.value) return;

			if (!store.isStreaming && !userSentMessage.value && !wasCanvasOpenBeforeSwitch.value) {
				return;
			}

			wasCanvasOpenBeforeSwitch.value = false;
			const dataTableId = latestDataTableResult.value.dataTableId;
			const registryEntry = [...store.resourceRegistry.values()].find(
				(e) => e.type === 'data-table' && e.id === dataTableId,
			);

			activeWorkflowId.value = null;
			activeExecutionId.value = null;
			activeDataTableId.value = dataTableId;
			activeDataTableProjectId.value = registryEntry?.projectId ?? null;
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
		if (deletedId && deletedId === activeDataTableId.value) {
			activeDataTableId.value = null;
			activeDataTableProjectId.value = null;
		}
	});

	return {
		activeWorkflowId,
		activeExecutionId,
		iframePushRef,
		activeDataTableId,
		activeDataTableProjectId,
		dataTableRefreshKey,
		isPreviewVisible,
		userSentMessage,
		workflowRefreshKey,
		openWorkflowPreview,
		openDataTablePreview,
		markUserSentMessage,
	};
}
