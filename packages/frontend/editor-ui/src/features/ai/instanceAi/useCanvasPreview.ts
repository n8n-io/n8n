import { computed, ref, watch } from 'vue';
import type { IconName } from '@n8n/design-system';
import {
	getLatestBuildResult,
	getLatestBuilderTarget,
	getLatestWorkflowSetupResult,
	getLatestWorkflowUpdateResult,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
	getLatestAgentArtifactResult,
	getExecutionResultsByWorkflow,
	type ExecutionResult,
} from './canvasPreview.utils';
import type { ThreadRuntime } from './instanceAi.store';

export interface ArtifactTab {
	id: string;
	type: 'workflow' | 'data-table' | 'agent';
	name: string;
	icon: IconName;
	projectId?: string;
}

const ARTIFACT_ICON_MAP: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
	agent: 'robot',
};

interface UseCanvasPreviewOptions {
	thread: ThreadRuntime;
	threadId: () => string;
}

export function useCanvasPreview({ thread }: UseCanvasPreviewOptions) {
	// --- Tab state ---
	const activeTabId = ref<string>();
	const isPreviewOpen = ref(false);

	// All previewable artifacts in the current thread, derived from resource registry.
	const allArtifactTabs = computed((): ArtifactTab[] => {
		const result: ArtifactTab[] = [];
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type === 'workflow' || entry.type === 'data-table' || entry.type === 'agent') {
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

	const activeAgentId = computed(() => {
		const tab = allArtifactTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'agent' ? tab.id : null;
	});

	const activeAgentProjectId = computed(() => {
		const tab = allArtifactTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'agent' ? (tab.projectId ?? null) : null;
	});

	const activeAgentTarget = computed(() => {
		const agentId = activeAgentId.value;
		if (!agentId) return undefined;
		const projectId = activeAgentProjectId.value;
		return {
			agentId,
			...(projectId ? { projectId } : {}),
		};
	});

	const executionResultsByWorkflow = computed(() => {
		const results = new Map<string, ExecutionResult>();
		for (const message of thread.messages) {
			if (!message.agentTree) continue;
			for (const [workflowId, result] of getExecutionResultsByWorkflow(message.agentTree)) {
				results.set(workflowId, result);
			}
		}
		return results;
	});

	const activeWorkflowExecutionResult = computed(() => {
		const workflowId = activeWorkflowId.value;
		return workflowId ? executionResultsByWorkflow.value.get(workflowId) : undefined;
	});

	const dataTableRefreshKey = ref(0);
	const agentRefreshKey = ref(0);

	const isPreviewVisible = computed(() => isPreviewOpen.value && activeTabId.value !== undefined);

	// --- Workflow attachments (e.g. an editor hand-off) ---
	// A workflow attached to a message surfaces as an artifact tab via the
	// resource registry. The first one is opened on arrival. (Its execution, if
	// any, is shown once by the preview itself — see consumePendingInitialExecution.)
	const firstAttachedWorkflowId = computed(() => {
		for (const message of thread.messages) {
			for (const attachment of message.attachments ?? []) {
				if (attachment.type === 'workflow') return attachment.id;
			}
		}
		return undefined;
	});

	// Open the attached workflow on arrival. Only when nothing is open, so it
	// never steals focus from an agent-driven open or a user selection.
	watch(
		firstAttachedWorkflowId,
		(id) => {
			if (!id || activeTabId.value !== undefined) return;
			activeTabId.value = id;
			isPreviewOpen.value = true;
		},
		{ immediate: true },
	);

	// --- Actions ---

	function selectTab(tabId: string) {
		activeTabId.value = tabId;
		isPreviewOpen.value = true;
	}

	function closePreview() {
		isPreviewOpen.value = false;
	}

	/**
	 * Open or switch the preview to a workflow.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openWorkflowPreview(workflowId: string): boolean {
		if (activeTabId.value === workflowId && isPreviewOpen.value) return false;
		activeTabId.value = workflowId;
		isPreviewOpen.value = true;
		return true;
	}

	/**
	 * Open or switch the preview to a data table.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openDataTablePreview(dataTableId: string, _projectId: string): boolean {
		if (activeTabId.value === dataTableId && isPreviewOpen.value) return false;
		activeTabId.value = dataTableId;
		isPreviewOpen.value = true;
		return true;
	}

	/**
	 * Open or switch the preview to an agent.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openAgentPreview(agentId: string, _projectId: string): boolean {
		if (activeTabId.value === agentId && isPreviewOpen.value) return false;
		activeTabId.value = agentId;
		isPreviewOpen.value = true;
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
			isPreviewOpen.value = true;
			workflowRefreshKey.value++;
		},
		{ flush: 'sync' },
	);

	// --- Auto-open canvas when an edit-mode builder spawns ---
	// The workflow-builder carries the existing workflow id in
	// `targetResource.id` from the moment it is spawned. Opening the preview
	// then — instead of waiting for the first build-workflow result — lets the
	// user see what is being edited as soon as the sub-agent is called.
	// Keyed by agentId so a fresh builder spawn re-triggers the preview.

	const latestBuilderTarget = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.agentTree) {
				const target = getLatestBuilderTarget(msg.agentTree);
				if (target) return target;
			}
		}
		return null;
	});

	watch(
		() => latestBuilderTarget.value?.agentId,
		(agentId) => {
			if (!agentId || !latestBuilderTarget.value) return;
			if (thread.isHydratingThread) return;

			activeTabId.value = latestBuilderTarget.value.workflowId;
			isPreviewOpen.value = true;
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

	// --- Refresh preview when a `workflows` update / restore-version / setup completes ---
	// The `workflows` tool's update / restore-version / setup actions mutate the
	// workflow definition but surface under tool name 'workflows', so
	// getLatestBuildResult doesn't detect them. Refresh the preview so the canvas
	// shows the latest state.

	const latestUpdateResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.agentTree) {
				const result = getLatestWorkflowUpdateResult(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

	watch(
		() => latestUpdateResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestUpdateResult.value) return;
			if (thread.isHydratingThread) return;

			const targetId = latestUpdateResult.value.workflowId;

			activeTabId.value = targetId;
			isPreviewOpen.value = true;
			workflowRefreshKey.value++;
		},
		{ flush: 'sync' },
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
			isPreviewOpen.value = true;
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
			if (!activeTabId.value) {
				isPreviewOpen.value = false;
			}
		}
	});

	// --- Auto-open / refresh agent preview when AI creates or mutates an agent ---

	const latestAgentArtifactResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.agentTree) {
				const result = getLatestAgentArtifactResult(msg.agentTree, activeAgentTarget.value);
				if (result) return result;
			}
		}
		return null;
	});

	watch(
		() => latestAgentArtifactResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestAgentArtifactResult.value) return;
			if (thread.isHydratingThread) return;

			const targetId = latestAgentArtifactResult.value.agentId;
			if (latestAgentArtifactResult.value.kind === 'created') {
				activeTabId.value = targetId;
				isPreviewOpen.value = true;
				agentRefreshKey.value++;
				return;
			}

			if (activeTabId.value === targetId) {
				agentRefreshKey.value++;
			}
		},
		{ flush: 'sync' },
	);

	return {
		activeTabId,
		allArtifactTabs,
		activeWorkflowId,
		activeDataTableId,
		activeDataTableProjectId,
		activeAgentId,
		activeAgentProjectId,
		activeWorkflowExecutionResult,
		dataTableRefreshKey,
		agentRefreshKey,
		isPreviewVisible,
		workflowRefreshKey,
		selectTab,
		closePreview,
		openWorkflowPreview,
		openDataTablePreview,
		openAgentPreview,
	};
}
