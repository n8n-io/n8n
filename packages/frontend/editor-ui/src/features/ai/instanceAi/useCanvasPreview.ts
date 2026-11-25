import { computed, ref, watch } from 'vue';
import type { InstanceAiAttachment } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRecentWorkflowsStore } from '@/app/stores/recentWorkflows.store';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import {
	getLatestBuildResult,
	getLatestWorkflowSetupResult,
	getLatestWorkflowUpdateResult,
	getLatestDataTableResult,
	getLatestDeletedDataTableIds,
	getLatestAgentArtifactResult,
	getLatestSkillArtifactResult,
	getLatestAppArtifactResult,
	getExecutionResultsByWorkflow,
} from './canvasPreview.utils';
import { useAgentMutationRefresh } from './composables/useAgentMutationRefresh';
import { useBuildingArtifactIds } from './composables/useBuildingArtifactIds';
import type { CloudBrowserTask } from './composables/useCloudBrowserTasks';
import { useIsAgentWorking } from './composables/useIsAgentWorking';
import {
	ARTIFACT_TAB_ICONS,
	useOpenArtifactTabs,
	type ThreadTabsStorage,
} from './composables/useOpenArtifactTabs';
import type { ArtifactThread } from './artifactThread';
import type { ArtifactTurn } from './artifactTurns';
import type { BuildTarget } from './composables/useWorkflowStaging';
import {
	draftTabId,
	getDraftWorkflowId,
	type WorkflowDraft,
	type WorkflowDraftsByFilePath,
} from './instanceAi.workflowDrafts';

export interface ArtifactTab {
	id: string;
	type: 'workflow' | 'data-table' | 'agent' | 'skill' | 'app';
	name: string;
	icon: IconName;
	projectId?: string;
	/** An agent artifact with no agent row behind it yet. */
	pending?: boolean;
	/** The AI is actively mutating this artifact right now. */
	building?: boolean;
	/** The run that builds this artifact waits on the user. Only a draft tab sets it. */
	waiting?: boolean;
	/** An unsaved workflow from the builder's source file. Never stored with the thread's tabs. */
	draft?: boolean;
}

/** The live view of a running cloud browser task. Never stored with the thread. */
export interface BrowserTab {
	id: string;
	type: 'browser';
	name: string;
	icon: IconName;
	taskId: string;
	/** Set while the task waits for the user to do a step in the browser. */
	userAction?: { reason: string };
}

/** A tab in the preview tab bar. */
export type PreviewTab = ArtifactTab | BrowserTab;

export function isArtifactTab(tab: PreviewTab): tab is ArtifactTab {
	return tab.type !== 'browser';
}

/** A tab of a saved artifact, which the agent knows. A draft or browser tab has no id that it can use. */
export function isSavedArtifactTab(tab: PreviewTab): tab is ArtifactTab {
	return isArtifactTab(tab) && !tab.draft;
}

const BROWSER_TAB_PREFIX = 'browser:';

function isBrowserTabId(tabId: string | undefined): boolean {
	return tabId?.startsWith(BROWSER_TAB_PREFIX) === true;
}

interface UseCanvasPreviewOptions {
	thread: ArtifactThread;
	threadId: () => string;
	initialAgentId?: () => string | undefined;
	initialAppId?: () => string | undefined;
	/** Saves the open tabs. Without it, the tabs reset when the thread loads again. */
	tabsStorage?: ThreadTabsStorage;
	/** The cloud browser tasks of the thread. A runtime without the cloud browser leaves it out. */
	cloudBrowserTasks?: () => CloudBrowserTask[];
	/** Unsaved workflows the builder wrote, by source file. */
	workflowDrafts?: () => WorkflowDraftsByFilePath;
	/** The canvas of a new workflow before its first draft, while the agent researches. */
	stagingDraft?: () => WorkflowDraft | undefined;
	/** The saved workflow that a running build works on. */
	buildTarget?: () => BuildTarget | undefined;
	/** Drops the drafts that a saved workflow replaced. */
	dismissWorkflowDrafts?: (workflowId: string) => void;
	/** The active run waits on the user, for an answer or an approval. */
	isAwaitingUser?: () => boolean;
}

interface LinkedAgentTarget {
	agentId: string;
	projectId: string;
}

/**
 * The artifact a message attachment refers to, if any. A nodes attachment refers
 * to its parent workflow only when it carries the workflow name, which marks that
 * workflow as a thread artifact.
 */
function getAttachedArtifactId(attachment: InstanceAiAttachment): string | undefined {
	if (attachment.type === 'workflow' || attachment.type === 'agent') return attachment.id;
	if (attachment.type === 'nodes' && attachment.workflowName) return attachment.workflowId;
	return undefined;
}

function fileName(filePath: string): string {
	return filePath.split('/').pop() ?? filePath;
}

function toDraftTab(draft: WorkflowDraft, building: boolean, waiting: boolean): ArtifactTab {
	return {
		id: draftTabId(draft.filePath),
		type: 'workflow',
		name: draft.workflow.name || fileName(draft.filePath),
		icon: ARTIFACT_TAB_ICONS.workflow,
		building,
		waiting: building && waiting,
		draft: true,
	};
}

export function useCanvasPreview({
	thread,
	initialAgentId,
	initialAppId,
	tabsStorage,
	cloudBrowserTasks: getCloudBrowserTasks,
	workflowDrafts = () => ({}),
	stagingDraft = () => undefined,
	buildTarget = () => undefined,
	dismissWorkflowDrafts,
	isAwaitingUser = () => false,
}: UseCanvasPreviewOptions) {
	const i18n = useI18n();
	/**
	 * A staging canvas that ended because the run read a saved workflow. It stays
	 * on screen until the tab of that workflow arrives with the result of the read.
	 */
	const heldStaging = ref<WorkflowDraft>();

	/** The drafts, with the staging canvas as one more draft. */
	function draftsWithStaging(): WorkflowDraft[] {
		const staging = stagingDraft() ?? heldStaging.value;
		const drafts = Object.values(workflowDrafts());
		return staging ? [...drafts, staging] : drafts;
	}

	const recentWorkflowsStore = useRecentWorkflowsStore();
	const skillsStore = useSkillsStore();

	// --- Tab state ---
	const activeTabId = ref<string>();
	// The stored tabs of the thread remember this. It applies once they load.
	const isPreviewOpen = ref(false);
	const linkedAgentTarget = ref<LinkedAgentTarget>();

	function setPreviewOpen(open: boolean, persist = true) {
		if (isPreviewOpen.value === open) return;
		isPreviewOpen.value = open;
		// Save the change, so a reload shows the preview as it was, also when the
		// agent opened it.
		if (persist) tabs.saveTabs(activeTabId.value);
	}

	const buildingArtifactIds = useBuildingArtifactIds(thread);
	const isAgentWorking = useIsAgentWorking(thread);

	// Tab the user picked while the agent was working. The auto-open watchers
	// below keep it in view until the run settles, so a streamed tool call
	// cannot undo the click. The pick lapses when something else moves the
	// selection, for example when the picked artifact is deleted.
	const userTabId = ref<string>();
	watch(isAgentWorking, (working) => {
		if (!working) userTabId.value = undefined;
	});

	// All previewable artifacts in the current thread, derived from resource registry.
	const artifactTabs = computed((): ArtifactTab[] => {
		const result: ArtifactTab[] = [];
		const linkedAgent = linkedAgentTarget.value;
		for (const entry of thread.producedArtifacts.values()) {
			if (
				entry.type === 'workflow' ||
				entry.type === 'data-table' ||
				entry.type === 'agent' ||
				entry.type === 'skill' ||
				entry.type === 'app'
			) {
				result.push({
					id: entry.id,
					type: entry.type,
					name: entry.name,
					icon: ARTIFACT_TAB_ICONS[entry.type],
					projectId:
						entry.projectId ??
						(entry.type === 'agent' && linkedAgent?.agentId === entry.id
							? linkedAgent.projectId
							: undefined),
					pending: entry.pending,
					building: buildingArtifactIds.value.has(entry.id),
				});
			}
		}

		// A new workflow shows as a draft tab until its saved workflow joins the registry.
		for (const draft of draftsWithStaging()) {
			if (draft.savedWorkflowId || draft.workflowId) continue;
			result.push(toDraftTab(draft, isAgentWorking.value, isAwaitingUser()));
		}

		if (linkedAgent && !result.some((tab) => tab.id === linkedAgent.agentId)) {
			const indexedAgent = [...thread.resourceNameIndex.values()].find(
				(entry) => entry.type === 'agent' && entry.id === linkedAgent.agentId,
			);
			result.push({
				id: linkedAgent.agentId,
				type: 'agent',
				name: indexedAgent?.name ?? linkedAgent.agentId,
				icon: ARTIFACT_TAB_ICONS.agent,
				projectId: indexedAgent?.projectId ?? linkedAgent.projectId,
				building: buildingArtifactIds.value.has(linkedAgent.agentId),
			});
		}

		return result;
	});

	// The tabs the user has open. The user can close artifacts and reorder tabs.
	const tabs = useOpenArtifactTabs({
		artifactTabs: () => artifactTabs.value,
		storage: tabsStorage,
		previewOpen: () => isPreviewOpen.value,
	});

	// --- Cloud browser tabs ---
	// Every running browser task has a tab. Closing the tab hides it until the user opens the
	// browser again. The tab goes away when the task ends, and is never stored: the live view
	// link is short-lived.
	const cloudBrowserTasks = computed(() => getCloudBrowserTasks?.() ?? []);
	const closedBrowserTaskIds = ref(new Set<string>());
	const browserTabs = computed((): BrowserTab[] =>
		cloudBrowserTasks.value
			.filter((task) => task.state === 'running' && !closedBrowserTaskIds.value.has(task.taskId))
			.map((task) => ({
				id: `${BROWSER_TAB_PREFIX}${task.taskId}`,
				type: 'browser',
				name: task.title || i18n.baseText('instanceAi.cloudBrowser.tabName'),
				icon: 'globe',
				taskId: task.taskId,
				userAction: task.userAction,
			})),
	);

	// A browser tab the user moved keeps its place on screen. The others go at the end.
	const tabPositions = ref(new Map<string, number>());

	const openTabs = computed((): PreviewTab[] => {
		const result: PreviewTab[] = [...tabs.openTabs.value];
		const positionOf = (tab: BrowserTab) => tabPositions.value.get(tab.id) ?? result.length;
		for (const tab of [...browserTabs.value].sort((a, b) => positionOf(a) - positionOf(b))) {
			result.splice(positionOf(tab), 0, tab);
		}
		return result;
	});

	const activeBrowserTab = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'browser' ? tab : null;
	});

	// The browser tabs the user has looked at. Each keeps its live view mounted, so a switch
	// back does not reload it. A tab the user has not opened loads nothing.
	const viewedBrowserTabIds = ref(new Set<string>());
	watch(activeBrowserTab, (tab) => {
		if (tab) viewedBrowserTabIds.value.add(tab.id);
	});
	const viewedBrowserTabs = computed(() =>
		browserTabs.value.filter((tab) => viewedBrowserTabIds.value.has(tab.id)),
	);

	// When the task of the active browser tab ends, show another tab.
	watch(browserTabs, (current) => {
		const activeId = activeTabId.value;
		if (!isBrowserTabId(activeId) || current.some((tab) => tab.id === activeId)) return;
		activeTabId.value = openTabs.value[0]?.id;
		if (userTabId.value === activeId) userTabId.value = undefined;
		if (activeTabId.value === undefined) setPreviewOpen(false, false);
	});

	// Derived preview state from active tab
	const activeWorkflowId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'workflow' && !tab.draft ? tab.id : null;
	});

	/** The tab id that shows a draft: its own tab, or the tab of its saved workflow. */
	function draftTargetTabId(draft: WorkflowDraft): string {
		return getDraftWorkflowId(draft) ?? draftTabId(draft.filePath);
	}

	/**
	 * An edit of a saved workflow that its run stopped or failed to save. The saved
	 * workflow did not change, so its canvas shows again.
	 */
	function isAbandonedEdit(draft: WorkflowDraft): boolean {
		if (!draft.workflowId || draft.savedWorkflowId) return false;
		return !isAgentWorking.value && !buildingArtifactIds.value.has(draft.workflowId);
	}

	/** The newest draft for the tab on screen. It covers the saved canvas until that loads. */
	const activeWorkflowDraft = computed((): WorkflowDraft | undefined => {
		const tabId = activeTabId.value;
		if (tabId === undefined) return undefined;
		let latest: WorkflowDraft | undefined;
		for (const draft of draftsWithStaging()) {
			if (draftTargetTabId(draft) !== tabId || isAbandonedEdit(draft)) continue;
			if (!latest || draft.revision > latest.revision) latest = draft;
		}
		return latest;
	});

	const activeDataTableId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'data-table' ? tab.id : null;
	});

	const activeDataTableProjectId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'data-table' ? (tab.projectId ?? null) : null;
	});

	const activeAgentId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'agent' ? tab.id : null;
	});

	const activeAgentProjectId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'agent' ? (tab.projectId ?? null) : null;
	});

	const activeAgentPending = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'agent' && tab.pending === true;
	});

	const activeSkillId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'skill' ? tab.id : null;
	});

	const activeApp = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === 'app' && tab.projectId ? { id: tab.id, projectId: tab.projectId } : null;
	});

	const executionResultsByWorkflow = computed(() =>
		getExecutionResultsByWorkflow(thread.artifactTurns),
	);

	const activeWorkflowExecutionResult = computed(() => {
		const workflowId = activeWorkflowId.value;
		return workflowId ? executionResultsByWorkflow.value.get(workflowId) : undefined;
	});

	const dataTableRefreshKey = ref(0);
	const skillRefreshKeys = ref(new Map<string, number>());
	const skillRefreshKey = computed(
		() => skillRefreshKeys.value.get(activeSkillId.value ?? '') ?? 0,
	);
	const appRefreshKey = ref(0);

	const isPreviewVisible = computed(
		() =>
			isPreviewOpen.value &&
			activeTabId.value !== undefined &&
			openTabs.value.some((tab) => tab.id === activeTabId.value),
	);

	// --- Resource attachments (workflow or agent hand-offs) ---
	// A workflow or agent attached to a message surfaces as an artifact tab via the
	// resource registry. The first one is opened on arrival. (Its execution, if
	// any, is shown once by the preview itself — see consumePendingInitialExecution.)
	const firstAttachedArtifactId = computed(() => {
		const tabIds = new Set(openTabs.value.map(({ id }) => id));
		for (const turn of thread.artifactTurns) {
			for (const attachment of turn.attachments ?? []) {
				const artifactId = getAttachedArtifactId(attachment);
				if (artifactId && tabIds.has(artifactId)) return artifactId;
			}
		}
		return undefined;
	});

	// An unsaved new-agent artifact carries no attachment (there is no agent to
	// attach yet), so it opens off the thread's pending marker instead — the user
	// arrived here by asking for a new agent, so it should already be on screen.
	const pendingAgentTabId = computed(() => artifactTabs.value.find((tab) => tab.pending)?.id);
	const initialAgentTabId = computed(() => {
		const agentId = initialAgentId?.();
		if (!agentId) return undefined;
		return artifactTabs.value.find((tab) => tab.type === 'agent' && tab.id === agentId)?.id;
	});

	const initialArtifactId = computed(
		() =>
			firstAttachedArtifactId.value ??
			pendingAgentTabId.value ??
			initialAgentTabId.value ??
			initialAppId?.() ??
			thread.pendingWorkflowAttachment?.id,
	);

	// Open the arriving resource. Only when nothing is open, so it never steals
	// focus from an agent-driven open or a user selection.
	// Wait for the stored tabs, so a preview the user closed does not open for a moment.
	watch(
		[initialArtifactId, tabs.isLoaded],
		([id, isLoaded]) => {
			if (!id || !isLoaded || activeTabId.value !== undefined) return;
			activeTabId.value = id;
			if (tabs.storedPreviewOpen.value !== false) setPreviewOpen(true, false);
		},
		{ immediate: true },
	);

	watch(
		[isPreviewOpen, openTabs, () => thread.isHydratingThread, initialArtifactId, tabs.isLoaded],
		([open, currentTabs, isHydrating, initialId, isLoaded]) => {
			// Wait for the stored tabs, so a closed tab does not open first.
			if (isHydrating || !isLoaded) return;
			if (open === true && activeTabId.value === undefined && currentTabs[0]) {
				activeTabId.value = currentTabs.some((tab) => tab.id === initialId)
					? initialId
					: currentTabs[0].id;
			}
		},
		{ immediate: true },
	);

	// A thread from before the server stored the tabs has none. Store the default
	// tabs once its messages load, so the artifacts the agent changes next join
	// them at the end.
	watch(
		[tabs.isLoaded, () => thread.isHydratingThread, () => artifactTabs.value.length],
		([isLoaded, isHydrating, artifactCount]) => {
			if (isLoaded && !isHydrating && artifactCount > 0) tabs.storeDefaultTabs();
		},
		{ immediate: true },
	);

	// Show the tab that was active, and the preview state, from when the user last
	// changed the tabs. A tab the user picks while the stored tabs load wins,
	// because the stored tabs are then ignored.
	watch(tabs.isLoaded, (isLoaded) => {
		if (!isLoaded) return;
		const stored = tabs.storedActiveTab.value;
		// Restore the tab first, so the first-tab fallback does not pick another one.
		if (stored && openTabs.value.some((tab) => tab.id === stored.id)) {
			activeTabId.value = stored.id;
		}
		const storedPreviewOpen = tabs.storedPreviewOpen.value;
		if (storedPreviewOpen !== undefined && storedPreviewOpen !== isPreviewOpen.value) {
			setPreviewOpen(storedPreviewOpen, false);
		}
	});

	// --- Actions ---

	// The user opened the workflow, so it shows in their recent workflows, as from the editor.
	function recordWorkflowOpen(workflowId: string) {
		const tab = openTabs.value.filter(isArtifactTab).find(({ id }) => id === workflowId);
		recentWorkflowsStore.registerWorkflowOpen(workflowId, tab?.projectId ?? thread.projectId);
	}

	/** Show a tab the user picked. Agent changes use `showAgentArtifact` instead. */
	function selectTab(tabId: string) {
		if (isBrowserTabId(tabId)) {
			activeTabId.value = tabId;
			userTabId.value = isAgentWorking.value ? tabId : undefined;
			// Not saved: the browser tab is gone after a reload.
			setPreviewOpen(true, false);
			return;
		}
		// Opening a closed artifact from the chat or the artifacts list shows its tab again.
		tabs.reopenTab(tabId);
		const tab = openTabs.value.find(({ id }) => id === tabId);
		if (tab?.type === 'workflow' && !tab.draft) {
			recordWorkflowOpen(tabId);
		}
		activeTabId.value = tabId;
		userTabId.value = isAgentWorking.value ? tabId : undefined;
		setPreviewOpen(true);
		tabs.saveTabs(tabId);
	}

	/** Open a tab for a resource the user picked, and show it. */
	function openTab(tab: ArtifactTab) {
		tabs.openTab(tab);
		selectTab(tab.id);
	}

	function reorderTab(tabId: string, toIndex: number) {
		const order = openTabs.value.map((tab) => tab.id);
		order.splice(order.indexOf(tabId), 1);
		order.splice(toIndex, 0, tabId);
		tabPositions.value = new Map(order.map((id, index): [string, number] => [id, index]));

		// The stored order has only the artifact tabs.
		if (isBrowserTabId(tabId)) return;
		tabs.moveTab(tabId, order.filter((id) => !isBrowserTabId(id)).indexOf(tabId));
		tabs.saveTabs(activeTabId.value);
	}

	function closeTab(tabId: string) {
		if (isBrowserTabId(tabId)) {
			const taskId = tabId.slice(BROWSER_TAB_PREFIX.length);
			closedBrowserTaskIds.value.add(taskId);
			viewedBrowserTabIds.value.delete(tabId);
			if (activeTabId.value === tabId) {
				activeTabId.value = openTabs.value.find((tab) => tab.id !== tabId)?.id;
				if (userTabId.value === tabId) userTabId.value = undefined;
				if (activeTabId.value === undefined) setPreviewOpen(false, false);
			}
			return;
		}
		const nextTabId = tabs.closeTab(tabId);
		if (activeTabId.value === tabId) {
			activeTabId.value = nextTabId;
			if (userTabId.value === tabId) userTabId.value = undefined;
			if (nextTabId === undefined) setPreviewOpen(false);
		}
		tabs.saveTabs(activeTabId.value);
	}

	function closePreview() {
		userTabId.value = undefined;
		setPreviewOpen(false);
		tabs.saveTabs(activeTabId.value);
	}

	// Show an artifact the agent just touched. Do not override a tab the user
	// picked during this run while it is still the one on screen.
	function showAgentArtifact(tabId: string) {
		// The agent changed this artifact, so a tab the user closed opens again.
		const reopened = tabs.reopenTab(tabId);
		const pinned = userTabId.value !== undefined && userTabId.value === activeTabId.value;
		if (!pinned) activeTabId.value = tabId;
		setPreviewOpen(true);
		if (reopened) tabs.saveTabs(activeTabId.value);
	}

	/** Show a running cloud browser task in its tab. */
	function openCloudBrowserTab(taskId: string) {
		const isRunning = cloudBrowserTasks.value.some(
			(task) => task.taskId === taskId && task.state === 'running',
		);
		if (!isRunning) return;
		closedBrowserTaskIds.value.delete(taskId);
		selectTab(`${BROWSER_TAB_PREFIX}${taskId}`);
	}

	/**
	 * Open or switch the preview to a workflow.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openWorkflowPreview(workflowId: string): boolean {
		if (activeTabId.value === workflowId && isPreviewOpen.value) {
			// Already on screen, for example after the agent opened it. The user still opened it.
			recordWorkflowOpen(workflowId);
			return false;
		}
		selectTab(workflowId);
		return true;
	}

	/**
	 * Show a workflow that a message the user just sent mentions. Its tab
	 * arrives with the message, so this only brings it into view.
	 */
	function showMentionedWorkflow(workflowId: string): boolean {
		if (!tabs.hasTab(workflowId)) return false;
		showAgentArtifact(workflowId);
		recordWorkflowOpen(workflowId);
		return true;
	}

	/**
	 * Open or switch the preview to a data table.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openDataTablePreview(dataTableId: string, _projectId: string): boolean {
		if (activeTabId.value === dataTableId && isPreviewOpen.value) return false;
		selectTab(dataTableId);
		return true;
	}

	/**
	 * Open or switch the preview to an agent.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active (so the caller can fall back to opening in a new tab instead).
	 */
	function openAgentPreview(agentId: string, projectId: string): boolean {
		linkedAgentTarget.value = { agentId, projectId };
		if (activeTabId.value === agentId && isPreviewOpen.value) return false;
		selectTab(agentId);
		return true;
	}

	/**
	 * Open or switch the preview to a skill or an app.
	 * Returns true if the preview tab changed; false if the tab was already
	 * active or does not exist (so the caller can fall back to opening in a new tab instead).
	 */
	function openArtifactPreview(artifactId: string): boolean {
		if (!tabs.hasTab(artifactId)) return false;
		if (activeTabId.value === artifactId && isPreviewOpen.value) return false;
		selectTab(artifactId);
		return true;
	}

	// --- Guard: fall back if active tab is removed from registry ---
	// Only acts when there ARE tabs but the selected one is missing (i.e. it was removed).
	// Skips when tabs are empty to avoid a race where the registry hasn't been populated yet.

	/** The staging canvas the staging watcher last saw. It picks the next tab when staging ends. */
	let lastStaging: WorkflowDraft | undefined;

	watch(openTabs, (currentTabs) => {
		if (activeTabId.value === undefined || currentTabs.length === 0) return;
		if (lastStaging && activeTabId.value === draftTabId(lastStaging.filePath)) return;
		const stillExists = currentTabs.some((t) => t.id === activeTabId.value);
		if (!stillExists) {
			activeTabId.value = currentTabs[0].id;
		}
	});

	// --- Auto-open canvas when AI creates/modifies a workflow ---

	const workflowRefreshKey = ref(0);

	const latestBuildResult = computed(() => getLatestBuildResult(thread.artifactTurns) ?? null);

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

			const targetId = latestBuildResult.value.workflowId;
			showAgentArtifact(targetId);
			// Refresh only the tab on screen; a tab opened later mounts fresh anyway.
			if (activeTabId.value === targetId) {
				workflowRefreshKey.value++;
			}
		},
		{ flush: 'sync' },
	);

	// --- Auto-open canvas when the orchestrator creates or changes an Agent ---
	// The builder tools run in the orchestrator, so their results carry the agent id.

	const latestAgentArtifactResult = computed(
		() => getLatestAgentArtifactResult(thread.artifactTurns) ?? null,
	);

	watch(
		() => latestAgentArtifactResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestAgentArtifactResult.value) return;
			if (thread.isHydratingThread) return;

			showAgentArtifact(latestAgentArtifactResult.value.agentId);
		},
		{ flush: 'sync' },
	);

	// --- Refresh preview when setup-workflow / workflow_builder_apply_workflow_credentials completes ---
	// These tools modify the workflow (credentials, parameters) but aren't detected
	// by getLatestBuildResult. Refresh the preview so the iframe shows the latest state.

	const latestSetupResult = computed(
		() => getLatestWorkflowSetupResult(thread.artifactTurns) ?? null,
	);

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

	// --- Refresh preview when `restore_workflow_version` or `setup_workflow` completes ---
	// These tools mutate the workflow definition, but getLatestBuildResult
	// doesn't detect them. Refresh the preview so the canvas
	// shows the latest state.

	const latestUpdateResult = computed(
		() => getLatestWorkflowUpdateResult(thread.artifactTurns) ?? null,
	);

	watch(
		() => latestUpdateResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestUpdateResult.value) return;
			if (thread.isHydratingThread) return;

			const targetId = latestUpdateResult.value.workflowId;

			showAgentArtifact(targetId);
			if (activeTabId.value === targetId) {
				workflowRefreshKey.value++;
			}
		},
		{ flush: 'sync' },
	);

	// --- Auto-open data table preview when AI creates/modifies a data table ---

	const latestDataTableResult = computed(
		() => getLatestDataTableResult(thread.artifactTurns) ?? null,
	);

	watch(
		() => latestDataTableResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestDataTableResult.value) return;
			if (thread.isHydratingThread) return;

			const targetId = latestDataTableResult.value.dataTableId;
			showAgentArtifact(targetId);
			if (activeTabId.value === targetId) {
				dataTableRefreshKey.value++;
			}
		},
		{ flush: 'sync' },
	);

	// --- Auto-open the tab of a skill or app that the assistant wrote ---
	// Only a successful write counts: a skill create or update, an app create or
	// commit. Reading, listing or mentioning one does not open it.

	function showLatestToolArtifact<T extends { toolCallId: string }>(
		getLatest: (turns: readonly ArtifactTurn[]) => T | undefined,
		artifactId: (result: T) => string,
		refresh: (id: string, result: T) => void,
	) {
		const latest = computed(() => getLatest(thread.artifactTurns) ?? null);

		watch(
			() => latest.value?.toolCallId,
			(toolCallId) => {
				if (!toolCallId || !latest.value) return;
				if (thread.isHydratingThread) return;

				const targetId = artifactId(latest.value);
				showAgentArtifact(targetId);
				refresh(targetId, latest.value);
			},
			{ flush: 'sync' },
		);
	}

	showLatestToolArtifact(
		getLatestSkillArtifactResult,
		(result) => result.skillId,
		(id, result) => {
			if (result.name) skillsStore.updateSkillName(id, result.name);
			// Inactive skill editors stay cached, so record their updates too.
			skillRefreshKeys.value.set(id, (skillRefreshKeys.value.get(id) ?? 0) + 1);
		},
	);
	showLatestToolArtifact(
		getLatestAppArtifactResult,
		(result) => result.appId,
		(id) => {
			if (activeTabId.value === id) appRefreshKey.value++;
		},
	);

	// --- Close data table preview if the active table is deleted ---

	// A batch can delete several tables at once. The joined key changes only when the deletion does.
	const latestDeletedDataTablesKey = computed(() =>
		getLatestDeletedDataTableIds(thread.artifactTurns).join(),
	);

	watch(latestDeletedDataTablesKey, () => {
		const deletedIds = getLatestDeletedDataTableIds(thread.artifactTurns);
		const deletedId = activeTabId.value;
		if (deletedId && deletedIds.includes(deletedId)) {
			const remaining = openTabs.value.filter((t) => t.id !== deletedId);
			activeTabId.value = remaining.length > 0 ? remaining[0].id : undefined;
			if (!activeTabId.value) {
				setPreviewOpen(false);
			}
		}
	});

	// --- Drafts: show each new draft, follow it to its saved workflow ---

	// Key on file and revision, so each write shows its workflow, but a save does not.
	// Revisions count per file and per run, so a new key marks the newest write.
	const unsavedDraftKeys = computed(() =>
		Object.values(workflowDrafts()).flatMap((draft) =>
			draft.savedWorkflowId ? [] : [`${draft.filePath}#${draft.revision}`],
		),
	);
	const draftsByKey = computed(
		() => new Map(Object.values(workflowDrafts()).map((d) => [`${d.filePath}#${d.revision}`, d])),
	);

	watch(
		unsavedDraftKeys,
		(keys, previousKeys = []) => {
			const previous = new Set(previousKeys);
			const key = keys.findLast((candidate) => !previous.has(candidate));
			const draft = key ? draftsByKey.value.get(key) : undefined;
			if (draft && !thread.isHydratingThread) showAgentArtifact(draftTargetTabId(draft));
		},
		{ flush: 'sync' },
	);

	watch(
		() => Object.values(workflowDrafts()).filter((draft) => draft.savedWorkflowId),
		(saved) => {
			for (const draft of saved) {
				const workflowId = draft.savedWorkflowId;
				if (!workflowId) continue;
				const tabId = draftTabId(draft.filePath);
				// The draft tab on screen becomes the saved workflow tab.
				if (activeTabId.value === tabId) activeTabId.value = workflowId;
				if (userTabId.value === tabId) userTabId.value = workflowId;
				// A saved draft off screen has nothing left to cover.
				if (activeTabId.value !== workflowId) dismissWorkflowDrafts?.(workflowId);
			}
		},
		{ flush: 'sync' },
	);

	// --- Build on a saved workflow: show its tab as soon as the build names it ---

	/** The workflow whose tab the build opens. An earlier turn is only a guess, so it does not count. */
	const openedTargetId = computed(() => {
		const target = buildTarget();
		return target && target.source !== 'thread' ? target.workflowId : undefined;
	});

	/** Leave the staging tab for the next tab, or close the preview when there is none. */
	function leaveStagingTab(stagingTabId: string, nextTabId: string | undefined, keepPick: boolean) {
		if (userTabId.value === stagingTabId) userTabId.value = keepPick ? nextTabId : undefined;
		if (activeTabId.value !== stagingTabId) return;
		activeTabId.value = nextTabId;
		if (nextTabId === undefined) setPreviewOpen(false);
	}

	function releaseHeldStaging(nextTabId: string | undefined) {
		const held = heldStaging.value;
		if (!held) return;
		heldStaging.value = undefined;
		leaveStagingTab(draftTabId(held.filePath), nextTabId, nextTabId !== undefined);
	}

	// Registered before the staging watcher, so that a staging canvas that ends
	// with the tab of its workflow already there goes straight to that tab.
	watch(
		() => {
			const id = openedTargetId.value;
			return id && tabs.hasTab(id) ? id : undefined;
		},
		(tabId) => {
			if (!tabId) return;
			releaseHeldStaging(tabId);
			if (!thread.isHydratingThread) showAgentArtifact(tabId);
		},
	);

	watch(openedTargetId, (id) => {
		if (!id) releaseHeldStaging(openTabs.value.at(-1)?.id);
	});

	// --- Staging: show the canvas of a new workflow, hand it to the run's first draft ---

	// Not sync: the staging canvas ends in the same update that adds the run's draft.
	watch(
		() => stagingDraft()?.filePath,
		(filePath) => {
			const previous = lastStaging;
			lastStaging = stagingDraft();
			if (filePath && !previous) {
				if (!thread.isHydratingThread) showAgentArtifact(draftTabId(filePath));
				return;
			}
			if (!previous || filePath) return;

			const stagingTabId = draftTabId(previous.filePath);
			const runDraft = Object.values(workflowDrafts()).find(
				(draft) => draft.runId === previous.runId && !draft.savedWorkflowId && !draft.workflowId,
			);
			if (runDraft) {
				leaveStagingTab(stagingTabId, draftTabId(runDraft.filePath), true);
				return;
			}
			const targetId = openedTargetId.value;
			if (targetId && activeTabId.value === stagingTabId) {
				// The run reads a saved workflow. Its tab comes with the result of the read.
				if (tabs.hasTab(targetId)) leaveStagingTab(stagingTabId, targetId, true);
				else heldStaging.value = previous;
				return;
			}
			leaveStagingTab(stagingTabId, openTabs.value.at(-1)?.id, false);
		},
		// A view that opens during the run shows the staging canvas that is there.
		{ immediate: true },
	);

	// --- Signal persisted builder config mutations onto the agents event bus ---
	useAgentMutationRefresh(thread);

	return {
		activeTabId,
		openTabs,
		/** False until the stored tabs of the thread load. */
		tabsLoaded: tabs.isLoaded,
		activeWorkflowId,
		activeWorkflowDraft,
		activeDataTableId,
		activeDataTableProjectId,
		activeAgentId,
		activeAgentProjectId,
		activeAgentPending,
		activeBrowserTab,
		browserTabs,
		viewedBrowserTabs,
		cloudBrowserTasks,
		activeSkillId,
		activeApp,
		activeWorkflowExecutionResult,
		dataTableRefreshKey,
		skillRefreshKey,
		appRefreshKey,
		isPreviewVisible,
		workflowRefreshKey,
		selectTab,
		openTab,
		reorderTab,
		closeTab,
		closePreview,
		openWorkflowPreview,
		showMentionedWorkflow,
		openDataTablePreview,
		openAgentPreview,
		openCloudBrowserTab,
		openSkillPreview: openArtifactPreview,
		openAppPreview: openArtifactPreview,
	};
}
