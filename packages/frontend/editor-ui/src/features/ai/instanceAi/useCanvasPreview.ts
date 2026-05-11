import { computed, ref, watch } from 'vue';
import type { IconName } from '@n8n/design-system';
import {
	getLatestBuildResult,
	getLatestWorkflowSetupResult,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
} from './canvasPreview.utils';
import type { ThreadRuntime } from './instanceAi.store';

export interface ArtifactTab {
	id: string;
	type: 'workflow' | 'data-table';
	name: string;
	icon: IconName;
	projectId?: string;
}

const ARTIFACT_ICON_MAP: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
};

interface UseCanvasPreviewOptions {
	thread: ThreadRuntime;
	threadId: () => string;
}

export function useCanvasPreview({ thread, threadId }: UseCanvasPreviewOptions) {
	// --- Tab state ---
	const activeTabId = ref<string>();

	// All artifacts (workflows + data tables) in the current thread, derived from resource registry
	const allArtifactTabs = computed((): ArtifactTab[] => {
		const result: ArtifactTab[] = [];
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type === 'workflow' || entry.type === 'data-table') {
				result.push({
					id: entry.id,
					type: entry.type,
					name: entry.name,
					icon: ARTIFACT_ICON_MAP[entry.type] ?? 'file',
					projectId: entry.projectId,
				});
			}
		}

		return result;
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

	const isPreviewVisible = computed(() => activeTabId.value !== undefined);

	// --- Actions ---

	function selectTab(tabId: string) {
		activeTabId.value = tabId;
	}

	function closePreview() {
		activeTabId.value = undefined;
	}

	/**
	 * Open or switch the preview to a workflow.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openWorkflowPreview(workflowId: string): boolean {
		if (activeTabId.value === workflowId) return false;
		activeTabId.value = workflowId;
		return true;
	}

	/**
	 * Open or switch the preview to a data table.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openDataTablePreview(dataTableId: string, _projectId: string): boolean {
		if (activeTabId.value === dataTableId) return false;
		activeTabId.value = dataTableId;
		return true;
	}

	// --- Guard: fall back if active tab is removed from registry ---
	// Only acts when there ARE tabs but the selected one is missing (i.e. it was removed).
	// Skips when tabs are empty to avoid a race where the registry hasn't been populated yet.

	watch(allArtifactTabs, (tabs) => {
		if (activeTabId.value === undefined || tabs.length === 0) return;
		const stillExists = tabs.some((t) => t.id === activeTabId.value);
		if (!stillExists) {
			activeTabId.value = tabs[0].id;
		}
	});

	// --- Reset preview on thread switch ---
	// Each thread is stateless for the preview panel: switching threads
	// closes the panel. Past artifacts are reachable via their inline
	// references in the message timeline.
	watch(threadId, (nextThreadId, oldThreadId) => {
		// Skip if this is the initial route setup (e.g. URL updated from
		// /instance-ai to /instance-ai/:threadId after the first message)
		if (!oldThreadId) return;
		// Skip if the thread ID hasn't actually changed
		if (nextThreadId === oldThreadId) return;

		activeTabId.value = undefined;
	});

	// --- Auto-open canvas when AI creates/modifies a workflow ---

	const workflowRefreshKey = ref(0);

	const latestBuildResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.agentTree) {
				const result = getLatestBuildResult(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

	// Watch the toolCallId — it changes even when the same workflow is rebuilt.
	// Auto-open logic:
	//   - During hydration (loading past conversations from the server) → skip,
	//     so re-entering an old thread doesn't pop the panel for past artifacts.
	//   - Otherwise (live build / late run-sync delivery) → open or switch tab.
	//
	// `flush: 'sync'` is required: hydration runs `messages.value = […]` then
	// clears `hydratingThreadId` in the same microtask. With the default `pre`
	// flush the callback would fire AFTER that clear and skip the gate.
	watch(
		() => latestBuildResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestBuildResult.value) return;
			if (thread.isHydratingThread) return;

			activeTabId.value = latestBuildResult.value.workflowId;
			workflowRefreshKey.value++;
		},
		{ flush: 'sync' },
	);

	// --- Refresh preview when setup-workflow / apply-workflow-credentials completes ---
	// These tools modify the workflow (credentials, parameters) but aren't detected
	// by getLatestBuildResult. Refresh the preview so the iframe shows the latest state.

	const latestSetupResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.agentTree) {
				const result = getLatestWorkflowSetupResult(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

	watch(
		() => latestSetupResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestSetupResult.value) return;

			const targetId = latestSetupResult.value.workflowId;

			// Only refresh if the setup targeted the currently active workflow tab
			if (activeTabId.value === targetId) {
				workflowRefreshKey.value++;
			}
		},
	);

	// --- Auto-open data table preview when AI creates/modifies a data table ---

	const latestDataTableResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
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
			if (thread.isHydratingThread) return;

			activeTabId.value = latestDataTableResult.value.dataTableId;
			dataTableRefreshKey.value++;
		},
		{ flush: 'sync' },
	);

	// --- Close data table preview if the active table is deleted ---

	const latestDeletedDataTableId = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
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
			activeTabId.value = remaining.length > 0 ? remaining[0].id : undefined;
		}
	});

	return {
		activeTabId,
		allArtifactTabs,
		activeWorkflowId,
		activeDataTableId,
		activeDataTableProjectId,
		dataTableRefreshKey,
		isPreviewVisible,
		workflowRefreshKey,
		selectTab,
		closePreview,
		openWorkflowPreview,
		openDataTablePreview,
	};
}
