<script lang="ts" setup>
import { computed, onMounted, onUnmounted, provide, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
	N8nHeading,
	N8nIconButton,
	N8nResizeWrapper,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import {
	StorageSerializers,
	onClickOutside,
	useDebounceFn,
	useElementSize,
	useLocalStorage,
	useWindowSize,
} from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	DEBOUNCE_TIME,
	LOCAL_STORAGE_INSTANCE_AI_ARTIFACT_PREVIEW_OPEN,
	LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO,
} from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { COLLAPSED_MAIN_SIDEBAR_WIDTH, useSidebarLayout } from '@/app/composables/useSidebarLayout';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { provideThread, useInstanceAiStore } from './instanceAi.store';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getAgentPreviewSessionFromThreadMetadata,
	getAgentPreviewViewFromThreadMetadata,
	getThreadDisplayTitle,
} from './instanceAi.threadRuntime';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { useCanvasPreview } from './useCanvasPreview';
import { buildInstanceAiAgentPreviewHandoffContext } from './composables/useInstanceAiHandoff';
import type { AgentPreviewHandoffParams } from './composables/useInstanceAiAgentPreviewHandoff';
import { useTransitionGate } from './useTransitionGate';
import { INSTANCE_AI_VIEW } from './constants';
import { getDismissedContextKeys } from './instanceAi.handoffContext';
import InstanceAiDebugPanel from './components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from './components/InstanceAiArtifactsPanel.vue';
import InstanceAiFixWithAiPanel from './components/InstanceAiFixWithAiPanel.vue';
import InstanceAiSetupPanel from './components/setupPanel/InstanceAiSetupPanel.vue';
import InstanceAiTestAgentPanel from './components/InstanceAiTestAgentPanel.vue';
import InstanceAiPreviewTabBar from './components/InstanceAiPreviewTabBar.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import InstanceAiConversation from './components/InstanceAiConversation.vue';
// Experiment cleanup: remove with openWorkflowInAssistant.
import OpenWorkflowInAssistantNotification from '@/experiments/openWorkflowInAssistant/components/OpenWorkflowInAssistantNotification.vue';
import InstanceAiWorkflowPreview, {
	type WorkflowFailuresReport,
} from './components/InstanceAiWorkflowPreview.vue';
import { buildFixWithAiPrompt } from './fixWithAi';
import { isAgentWorthTesting, testAgentOfferKey } from './testAgentOffer';
import InstanceAiDataTablePreview from './components/InstanceAiDataTablePreview.vue';
import InstanceAiAgentPreview from './components/InstanceAiAgentPreview.vue';
import { TabsRoot } from 'reka-ui';
import { useAgentEvalsFlag } from '@/features/ai/evaluation.ee/composables/useAgentEvalsFlag';
import { useAgentCapabilitySummary } from '@/features/agents/composables/useAgentCapabilitySummary';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import { useIsAgentWorking } from './composables/useIsAgentWorking';
import { useAgentReturnContextStore } from '@/features/agents/agentReturnContext.store';

const props = defineProps<{
	threadId: string;
}>();

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const thread = provideThread(props.threadId);
const rootStore = useRootStore();
const i18n = useI18n();
const router = useRouter();
const { width: windowWidth } = useWindowSize();
const { isCollapsed: isMainSidebarCollapsed, sidebarWidth: mainSidebarWidth } = useSidebarLayout();
const toast = useToast();

const conversationRef = useTemplateRef<InstanceType<typeof InstanceAiConversation>>('conversation');

// The conversation owns the composer-handoff state; read it through the
// template ref for the agent-preview session id below and for
// `InstanceAiArtifactsPanel`, a sibling of the conversation rather than a
// descendant of it.
const handoffContext = computed(() => conversationRef.value?.pendingComposerContext ?? null);

function onThreadMissing() {
	// The user may have navigated to another thread before this one reported
	// missing; only redirect if we're still on the thread that went missing.
	if (router.currentRoute.value.params.threadId !== props.threadId) return;
	void router.replace({ name: INSTANCE_AI_VIEW });
}

function onAgentAttachmentRestored(attachment: InstanceAiAgentAttachment) {
	preview.openAgentPreview(attachment.id, attachment.projectId);
}

// --- Fix-with-AI offer (failure data emitted by the artifact host) ---
const failedRun = ref<WorkflowFailuresReport | null>(null);
const dismissedExecutionId = ref<string | null>(null);

const isChatInProgress = computed(
	() => thread.isStreaming || thread.isSendingMessage || thread.isAwaitingConfirmation,
);

const activeFixWithAiOffer = computed(() => {
	const run = failedRun.value;
	if (!run) return null;
	if (run.executionId === dismissedExecutionId.value) return null;
	if (isChatInProgress.value) return null;
	return {
		...run,
		workflowName: thread.producedArtifacts.get(run.workflowId)?.name,
	};
});

// --- "Test your agent" offer (post-setup suggestion) ---
const isAgentEvalsEnabled = useAgentEvalsFlag();
const agentEvalsStore = useAgentEvalsStore();

// Passed the local runtime because this component provides the thread rather
// than inheriting it, so the composable's own `useThread()` inject would fail.
const isAgentWorking = useIsAgentWorking(thread);

// The agent the builder actually persisted in this thread. Absent until then,
// which is what keeps the suggestion from firing mid-build.
const agentBuilderTarget = computed(() =>
	getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(thread.id)),
);

/**
 * The agent this thread would offer to test, before the checks that need its
 * capabilities. Resolves to null for the conditions we can decide without a
 * network call — flag off, nothing built, already dismissed — so the capability
 * summary is never fetched for a card the user will not be shown.
 */
const testAgentOfferCandidate = computed(() => {
	if (!isAgentEvalsEnabled.value) return null;
	const target = agentBuilderTarget.value;
	if (!target) return null;

	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	return dismissedKeys.has(testAgentOfferKey(target.agentId)) ? null : target;
});

const offerAgentId = computed(() => testAgentOfferCandidate.value?.agentId ?? '');
const offerProjectId = computed(() => testAgentOfferCandidate.value?.projectId ?? '');

const { summary: offerAgentSummary } = useAgentCapabilitySummary(offerProjectId, offerAgentId);

const activeTestAgentOffer = computed(() => {
	const target = testAgentOfferCandidate.value;
	if (!target) return null;
	// Waiting for the run to settle keeps the card from appearing while the
	// assistant is still adding tools the generated cases would need to cover.
	if (isAgentWorking.value) return null;
	// Don't offer to draft cases for an agent that already has some — e.g. the
	// user generated them from the Evals tab without dismissing this card.
	// Only suppresses when the store already knows; deliberately no fetch just to
	// answer this, so a cold thread can still offer once against an agent whose
	// datasets have never been loaded.
	if (
		agentEvalsStore.isLoaded(target.agentId) &&
		agentEvalsStore.getDatasets(target.agentId).length
	)
		return null;
	if (!isAgentWorthTesting(offerAgentSummary.value)) return null;

	return target;
});

// --- Header title ---
// Returns the resolved title once we have one, or undefined while we're still
// figuring out which thread to show. Rendering only on a defined value avoids
// the "New conversation" → real title flash when resuming a recent thread.
const currentThreadTitle = computed<string | undefined>(() =>
	getThreadDisplayTitle(
		store.threads.find((t) => t.id === props.threadId),
		thread.messages,
	),
);

// The tab names the conversation, not the workflow previewed inside it — the
// parent view claims the title so the embedded canvas can't overwrite this.
const documentTitle = useDocumentTitle();
watch(
	currentThreadTitle,
	(title) => documentTitle.set(title ?? i18n.baseText('instanceAi.view.title')),
	{ immediate: true },
);

// --- Canvas / data table preview ---
// null = no preference yet, so the first artifact still opens the preview.
// Sync flush keeps a thread switch from exposing the old thread's value for a tick.
const persistedArtifactPreviewOpen = useLocalStorage<boolean | null>(
	() => LOCAL_STORAGE_INSTANCE_AI_ARTIFACT_PREVIEW_OPEN(props.threadId),
	null,
	{ serializer: StorageSerializers.boolean, writeDefaults: false, flush: 'sync' },
);
const preview = useCanvasPreview({
	thread,
	threadId: () => props.threadId,
	initialAgentId: () =>
		getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(props.threadId))?.agentId,
	previewOpenState: () => persistedArtifactPreviewOpen.value ?? undefined,
	onPreviewOpenChange: (open) => {
		persistedArtifactPreviewOpen.value = open;
	},
});
watch(
	[() => preview.activeTabId.value, () => preview.isPreviewVisible.value],
	([tabId, previewVisible]) => {
		thread.setActiveArtifactId(previewVisible ? tabId : undefined);
	},
	{ immediate: true },
);
// --- Setup panel (checklist docked above the composer) ---
// Anchors to the active canvas tab's workflow; on a hydrated thread with no
// tab state yet, the latest workflow artifact wins (insertion order).
const setupPanelWorkflowId = computed(() => {
	if (!settingsStore.isInstanceAiSetupPanelEnabled) return undefined;
	const active = preview.activeWorkflowId.value;
	if (preview.activeTabId.value) return active ?? undefined;
	let latest: string | undefined;
	for (const entry of thread.producedArtifacts.values()) {
		if (entry.type === 'workflow') latest = entry.id;
	}
	return latest;
});
const setupPanelProjectId = computed(() =>
	setupPanelWorkflowId.value
		? thread.producedArtifacts.get(setupPanelWorkflowId.value)?.projectId
		: undefined,
);

const agentReturnContext = useAgentReturnContextStore().consumePendingArtifactReturn();
const agentReturnWorkflowId = agentReturnContext?.workflowId;
const agentReturnNodeId = ref(agentReturnContext?.nodeId);
if (agentReturnWorkflowId) {
	preview.openWorkflowPreview(agentReturnWorkflowId);
}

function consumeAgentReturnNodeId() {
	agentReturnNodeId.value = undefined;
}

function openAgentChatPreview(agentId: string, projectId: string): boolean {
	preview.openAgentPreview(agentId, projectId);
	isAgentPreviewDockOpen.value = true;
	return true;
}

const activeAgentPreviewSessionId = computed(() => {
	const context = handoffContext.value;
	if (context?.source === 'agent-preview' && context.agentId === preview.activeAgentId.value) {
		return context.threadId;
	}

	const metadata = store.getThreadMetadata(props.threadId);
	const persisted =
		getAgentPreviewViewFromThreadMetadata(metadata) ??
		getAgentPreviewSessionFromThreadMetadata(metadata);
	return persisted?.agentId === preview.activeAgentId.value ? persisted.threadId : undefined;
});

provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);
provide('openAgentPreview', preview.openAgentPreview);
provide('openAgentChatPreview', openAgentChatPreview);
provide('pendingComposerContext', handoffContext);
provide(
	'dismissPendingComposerContext',
	(key: string) => conversationRef.value?.dismissPendingComposerContext(key) ?? false,
);

// --- Side panels ---
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');
const hasPreviewTabs = computed(() => preview.allArtifactTabs.value.length > 0);
const isArtifactsPanelRevealed = ref(false);
const isArtifactsPanelDismissedInLayout = ref(false);
const MIN_AVAILABLE_WIDTH_FOR_PINNED_ARTIFACTS_PANEL = 900;
const artifactsPanelTransitionGate = useTransitionGate({
	isBlocked: () => thread.isHydratingThread,
});
const previewPanelTransitionGate = useTransitionGate({
	isBlocked: () => thread.isHydratingThread,
});
const isArtifactsPanelTransitionEnabled = artifactsPanelTransitionGate.isEnabled;
const isPreviewPanelTransitionEnabled = previewPanelTransitionGate.isEnabled;
const isPreviewPanelTransitioning = ref(false);
const artifactsPreviewToggleLabel = computed(() =>
	i18n.baseText(
		preview.isPreviewVisible.value
			? 'instanceAi.artifactsPanel.hidePreview'
			: 'instanceAi.artifactsPanel.showPreview',
	),
);
const artifactsPanelToggleLabel = computed(() =>
	i18n.baseText(
		showArtifactsPanel.value
			? 'instanceAi.artifactsPanel.hidePanel'
			: 'instanceAi.artifactsPanel.showPanel',
	),
);
const artifactsPanelTransitionName = computed(() =>
	isPreviewPanelTransitioning.value ? 'artifacts-panel-preview' : 'artifacts-panel-fade',
);

function toggleArtifactsPreview() {
	if (preview.isPreviewVisible.value) {
		preview.closePreview();
		return;
	}

	const selectedTab = preview.allArtifactTabs.value.find(
		(tab) => tab.id === preview.activeTabId.value,
	);
	const tabToOpen = selectedTab ?? preview.allArtifactTabs.value[0];
	if (tabToOpen) {
		preview.selectTab(tabToOpen.id);
	}
}

function toggleArtifactsPanel() {
	if (!canShowArtifactsPanel.value || preview.isPreviewVisible.value) {
		return;
	}

	if (showArtifactsPanel.value) {
		if (isArtifactsPanelInLayout.value) {
			isArtifactsPanelDismissedInLayout.value = true;
			return;
		}
		isArtifactsPanelRevealed.value = false;
		return;
	}

	if (isArtifactsPanelInLayout.value) {
		isArtifactsPanelDismissedInLayout.value = false;
		return;
	}

	isArtifactsPanelRevealed.value = true;
}

function enablePanelTransitionsAfterStableRender() {
	artifactsPanelTransitionGate.enableAfterStableRender();
	previewPanelTransitionGate.enableAfterStableRender();
}

function suppressPanelTransitionsUntilStableRender() {
	artifactsPanelTransitionGate.suppressUntilStableRender();
	previewPanelTransitionGate.suppressUntilStableRender();
}

// --- Preview panel resize (when canvas is visible) ---
const threadAreaRef = useTemplateRef<HTMLElement>('threadArea');
const { width: threadAreaWidth } = useElementSize(threadAreaRef);
const mainSidebarOccupiedWidth = computed(() =>
	isMainSidebarCollapsed.value ? COLLAPSED_MAIN_SIDEBAR_WIDTH : (mainSidebarWidth.value ?? 0),
);
const availableWidthForPinnedArtifactsPanel = computed(
	() => windowWidth.value - mainSidebarOccupiedWidth.value,
);
const isArtifactsPanelInLayout = computed(
	() =>
		availableWidthForPinnedArtifactsPanel.value >= MIN_AVAILABLE_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
);
const canShowArtifactsPanel = computed(
	() =>
		thread.hasMessages ||
		preview.allArtifactTabs.value.length > 0 ||
		(Boolean(props.threadId) && thread.isHydratingThread),
);
const showArtifactsPanel = computed(
	() =>
		canShowArtifactsPanel.value &&
		!preview.isPreviewVisible.value &&
		(isArtifactsPanelInLayout.value
			? !isArtifactsPanelDismissedInLayout.value
			: isArtifactsPanelRevealed.value),
);
const showArtifactsPanelToggle = computed(
	() => canShowArtifactsPanel.value && !preview.isPreviewVisible.value,
);
const reserveArtifactsPanelLayout = computed(
	() => showArtifactsPanel.value && isArtifactsPanelInLayout.value,
);
const shouldAnimateArtifactsPanel = computed(
	() => isArtifactsPanelTransitionEnabled.value && isArtifactsPanelInLayout.value,
);
const shouldSuppressContentLayoutTransitions = computed(
	() => !isPreviewPanelTransitionEnabled.value,
);
const artifactsPanelSlotRef = useTemplateRef<HTMLElement>('artifactsPanelSlot');
const isResizingPreview = ref(false);
const isThreadAreaResizing = ref(false);
const isPreviewExpanded = ref(false);
const isAgentPreviewDockOpen = ref(false);
const MIN_SPLIT_PANEL_WIDTH = 400;
const DEFAULT_CHAT_PANEL_CONTENT_WIDTH = 800;
// Share of the thread area, so the split survives window and sidebar resizes. -1 = no preference yet.
const chatPanelWidthRatio = useLocalStorage(LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO, -1, {
	writeDefaults: false,
});

// The composer requesting focus (e.g. after a canvas action) reads as the user
// wanting the chat back — collapse the expanded preview so it's visible again.
// The conversation itself owns focusing the input for the same trigger.
watch(
	() => store.composerFocusRequest,
	() => {
		isPreviewExpanded.value = false;
	},
);

watch(
	preview.activeTabId,
	(activeTabId, previousActiveTabId) => {
		if (activeTabId !== previousActiveTabId) {
			isAgentPreviewDockOpen.value = false;
		}
	},
	{ flush: 'sync' },
);

// Below two panel minimums the limits meet at half, so both panels share the space evenly.
const halfThreadAreaWidth = computed(() => Math.round(threadAreaWidth.value / 2));
const previewMinWidth = computed(() => Math.min(MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value));
const previewMaxWidth = computed(() =>
	Math.max(threadAreaWidth.value - MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value),
);
const previewPanelWidth = computed(() => {
	const ratio = chatPanelWidthRatio.value;
	const chatPanelWidth =
		ratio >= 0 && ratio <= 1 ? threadAreaWidth.value * ratio : DEFAULT_CHAT_PANEL_CONTENT_WIDTH;
	return Math.round(
		Math.min(
			Math.max(threadAreaWidth.value - chatPanelWidth, previewMinWidth.value),
			previewMaxWidth.value,
		),
	);
});
const isPreviewResizeEnabled = computed(
	() => !isPreviewExpanded.value && previewMinWidth.value < previewMaxWidth.value,
);
const shouldAnimatePreviewLayout = computed(
	() =>
		isPreviewPanelTransitionEnabled.value &&
		!isResizingPreview.value &&
		!isThreadAreaResizing.value,
);
const AGENT_PREVIEW_CHAT_MIN_WIDTH = 320;
const AGENT_PREVIEW_CHAT_PREFERRED_WIDTH = 480;
const AGENT_PREVIEW_CHAT_MAX_RATIO = 0.5;

/** Keep the agent chat readable without using more than half of its preview panel. */
const agentPreviewChatColumnWidth = computed(() => {
	const containerWidth = isPreviewExpanded.value ? threadAreaWidth.value : previewPanelWidth.value;
	const maximumWidth = containerWidth * AGENT_PREVIEW_CHAT_MAX_RATIO;
	const minimumWidth = Math.min(AGENT_PREVIEW_CHAT_MIN_WIDTH, maximumWidth);

	return Math.round(
		Math.max(minimumWidth, Math.min(AGENT_PREVIEW_CHAT_PREFERRED_WIDTH, maximumWidth)),
	);
});

/** Add custom width to Agent Preview chat when canvas area is full expanded. */
const agentPreviewPanelStyle = computed(() => {
	const chatColumnWidth = {
		'--agent-preview-chat-column-width': `${agentPreviewChatColumnWidth.value}px`,
	};

	return isPreviewExpanded.value
		? chatColumnWidth
		: { ...chatColumnWidth, width: `${previewPanelWidth.value}px` };
});

function togglePreviewExpanded() {
	isPreviewExpanded.value = !isPreviewExpanded.value;
}

function handleAgentPreviewDockOpenChange(open: boolean) {
	isAgentPreviewDockOpen.value = open;
}

function handlePreviewResize({ width }: { width: number }) {
	// The wrapper clamps the width, so an unchanged value means the drag hit a limit: keep the stored ratio.
	if (Math.round(width) === previewPanelWidth.value) return;
	chatPanelWidthRatio.value = (threadAreaWidth.value - width) / threadAreaWidth.value;
}

function handlePreviewPanelAfterEnter() {
	isPreviewPanelTransitioning.value = false;
	// The slide-in animates the panel width from 0 to its target, so any
	// fitView the iframe ran during the transition computed zoom against a
	// near-zero viewport. Re-fit now that the iframe has its final size.
	workflowPreviewRef.value?.requestFitView();
}

function handlePreviewPanelAfterLeave() {
	isPreviewPanelTransitioning.value = false;
	isPreviewExpanded.value = false;
}

watch(
	preview.isPreviewVisible,
	(visible, wasVisible) => {
		if (visible !== wasVisible) {
			isPreviewPanelTransitioning.value = isPreviewPanelTransitionEnabled.value;
		}

		if (!visible) {
			isAgentPreviewDockOpen.value = false;
		} else {
			isArtifactsPanelRevealed.value = false;
		}
	},
	{ flush: 'sync' },
);

const finishThreadAreaResize = useDebounceFn(() => {
	isThreadAreaResizing.value = false;
}, getDebounceTime(DEBOUNCE_TIME.UI.RESIZE));

watch(
	threadAreaWidth,
	(width, previousWidth) => {
		if (
			typeof previousWidth === 'number' &&
			previousWidth > 0 &&
			width !== previousWidth &&
			preview.isPreviewVisible.value
		) {
			isThreadAreaResizing.value = true;
			void finishThreadAreaResize();
		}
	},
	{ immediate: true },
);

watch(isArtifactsPanelInLayout, (isInLayout) => {
	isArtifactsPanelRevealed.value = false;

	if (isInLayout) {
		isArtifactsPanelDismissedInLayout.value = false;
	}
});

watch(canShowArtifactsPanel, (canShow) => {
	if (!canShow) {
		isArtifactsPanelRevealed.value = false;
		isArtifactsPanelDismissedInLayout.value = false;
	}
});

onClickOutside(
	artifactsPanelSlotRef,
	() => {
		if (isArtifactsPanelInLayout.value) return;
		isArtifactsPanelRevealed.value = false;
	},
	{ ignore: ['[data-test-id="instance-ai-artifacts-panel-toggle"]', '.n8n-tooltip'] },
);

watch(
	() => props.threadId,
	(threadId, previousThreadId) => {
		if (threadId !== previousThreadId) {
			isAgentPreviewDockOpen.value = false;
			suppressPanelTransitionsUntilStableRender();
		}
	},
);

watch(
	() => thread.isHydratingThread,
	(isHydrating) => {
		if (isHydrating) {
			artifactsPanelTransitionGate.suppress();
			previewPanelTransitionGate.suppress();
			return;
		}
		suppressPanelTransitionsUntilStableRender();
	},
);

onMounted(() => {
	enablePanelTransitionsAfterStableRender();
});

onUnmounted(() => {
	// This view owns its thread's runtime, so it disposes it here (closes the
	// SSE, clears state, drops it from the store) — but only once the app has
	// left this thread's route. Suspense can create a duplicate instance of
	// this view for the same thread during layout transitions (e.g. an editor
	// hand-off that loads the AIA chunks) and discard one; that discarded
	// instance's unmount fires while the route still points at the thread, and
	// must not tear down the runtime the live instance is rendering.
	if (router.currentRoute.value.params.threadId !== props.threadId) {
		store.disposeRuntime(props.threadId);
		// Guarded by the same route check, and scoped to this thread's agent: a
		// discarded duplicate instance must not drop a request the live instance's
		// builder is still about to claim.
		const offeredAgentId = agentBuilderTarget.value?.agentId;
		if (offeredAgentId) agentEvalsStore.clearEvalsFocus(offeredAgentId);
	}
});

const workflowPreviewRef =
	useTemplateRef<InstanceType<typeof InstanceAiWorkflowPreview>>('workflowPreview');

function handleFixWithAiFromOffer() {
	const offer = activeFixWithAiOffer.value;
	if (!offer) return;

	dismissedExecutionId.value = offer.executionId;
	conversationRef.value?.resetScroll();
	void thread.sendMessage(
		buildFixWithAiPrompt({ workflowName: offer.workflowName, errors: offer.errors }),
		{
			authorship: { kind: 'prefill', prefillType: 'handoff_fix_with_ai' },
			pushRef: rootStore.pushRef,
		},
	);
}

function dismissFixWithAiOffer() {
	const offer = activeFixWithAiOffer.value;
	if (!offer) return;
	dismissedExecutionId.value = offer.executionId;
}

function handleWorkflowFailures(report: WorkflowFailuresReport) {
	failedRun.value = report;
}

function handleAgentPreviewAssistantHandoff(params: AgentPreviewHandoffParams) {
	if (
		params.agentId !== preview.activeAgentId.value ||
		params.projectId !== preview.activeAgentProjectId.value
	) {
		return;
	}
	if (conversationRef.value?.isDirty()) {
		toast.showMessage({
			title: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.title'),
			message: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.message'),
			type: 'warning',
		});
		return;
	}

	// The request now belongs to the assistant composer beside it, so leaving the
	// preview chat open reads as two places to ask the same thing.
	isAgentPreviewDockOpen.value = false;

	conversationRef.value?.applyHandoff(
		buildInstanceAiAgentPreviewHandoffContext(params),
		params.initialDraft,
	);
}

/**
 * Reveal the agent artifact, then hand off to the builder to select its Evals
 * tab and generate. Generation deliberately stays in the builder: it already
 * owns the call, its loading flag and its error toast, so driving it from here
 * would be a second call site for the same operation.
 */
async function handleGenerateTestCasesFromOffer() {
	const target = activeTestAgentOffer.value;
	if (!target) return;

	// Raise the request before revealing the artifact: the builder consumes it on
	// mount, so ordering doesn't matter, and the panel may not be open yet.
	agentEvalsStore.requestEvalsFocus(target.agentId, true);
	preview.openAgentPreview(target.agentId, target.projectId);
	await persistTestAgentOfferDismissal(target.agentId);
}

async function dismissTestAgentOffer() {
	const target = activeTestAgentOffer.value;
	if (!target) return;
	await persistTestAgentOfferDismissal(target.agentId);
}

// Persisted for the CTA as well as "Maybe later": once the user has acted on the
// suggestion, re-offering it on the next visit is noise.
async function persistTestAgentOfferDismissal(agentId: string) {
	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	dismissedKeys.add(testAgentOfferKey(agentId));
	await store.updateThreadMetadata(thread.id, {
		dismissedContextKeys: [...dismissedKeys],
	});
}
</script>

<template>
	<div
		ref="threadArea"
		:class="[
			$style.threadArea,
			{
				agentPreviewDockOpen: isAgentPreviewDockOpen,
			},
		]"
		data-test-id="instance-ai-thread-area"
	>
		<!-- Main chat area -->
		<div
			:class="[
				$style.chatArea,
				{
					[$style.agentPreviewLayoutTransition]: shouldAnimatePreviewLayout,
				},
			]"
			:data-layout-animated="shouldAnimatePreviewLayout"
			data-test-id="instance-ai-builder-chat"
		>
			<div :class="$style.builderChatHeader" data-test-id="instance-ai-builder-chat-header">
				<InstanceAiViewHeader>
					<template #title>
						<N8nHeading v-if="currentThreadTitle" tag="h2" size="small" :class="$style.headerTitle">
							{{ currentThreadTitle }}
						</N8nHeading>
						<N8nText
							v-if="thread.sseState === 'reconnecting'"
							size="small"
							color="text-light"
							:class="$style.reconnecting"
						>
							{{ i18n.baseText('instanceAi.view.reconnecting') }}
						</N8nText>
					</template>
					<template #actions>
						<N8nIconButton
							v-if="isDebugEnabled"
							icon="bug"
							variant="ghost"
							size="small"
							icon-size="large"
							:class="{ [$style.activeButton]: showDebugPanel }"
							@click="
								showDebugPanel = !showDebugPanel;
								store.debugMode = showDebugPanel;
							"
						/>
						<N8nTooltip
							:content="artifactsPanelToggleLabel"
							placement="bottom"
							:show-after="TOOLTIP_DELAY_MS"
						>
							<Transition name="preview-toggle-opacity" :css="isArtifactsPanelTransitionEnabled">
								<N8nIconButton
									v-if="showArtifactsPanelToggle"
									icon="list"
									variant="ghost"
									size="small"
									icon-size="large"
									data-test-id="instance-ai-artifacts-panel-toggle"
									:aria-label="artifactsPanelToggleLabel"
									:aria-pressed="showArtifactsPanel"
									:disabled="!canShowArtifactsPanel"
									@click="toggleArtifactsPanel"
								/>
							</Transition>
						</N8nTooltip>
						<N8nTooltip
							:content="artifactsPreviewToggleLabel"
							placement="bottom"
							:show-after="TOOLTIP_DELAY_MS"
						>
							<Transition name="preview-toggle-opacity" :css="isPreviewPanelTransitionEnabled">
								<N8nIconButton
									v-if="!preview.isPreviewVisible.value"
									icon="panel-right"
									variant="ghost"
									size="small"
									icon-size="large"
									data-test-id="instance-ai-artifacts-preview-toggle"
									:aria-label="artifactsPreviewToggleLabel"
									:aria-pressed="preview.isPreviewVisible.value"
									:disabled="!hasPreviewTabs"
									@click="toggleArtifactsPreview"
								/>
							</Transition>
						</N8nTooltip>
					</template>
				</InstanceAiViewHeader>
			</div>

			<!-- Content area: chat + artifacts side by side below header -->
			<div
				:class="[
					$style.contentArea,
					{
						[$style.contentAreaWithPinnedArtifacts]: reserveArtifactsPanelLayout,
					},
					{ [$style.contentAreaWithoutLayoutTransitions]: shouldSuppressContentLayoutTransitions },
				]"
				:data-layout-transitions-enabled="isPreviewPanelTransitionEnabled"
				data-test-id="instance-ai-content-area"
			>
				<InstanceAiConversation
					ref="conversation"
					@thread-missing="onThreadMissing"
					@agent-attachment-restored="onAgentAttachmentRestored"
				>
					<template #above-input>
						<InstanceAiSetupPanel
							v-if="setupPanelWorkflowId"
							:workflow-id="setupPanelWorkflowId"
							:project-id="setupPanelProjectId"
						/>
					</template>
					<template #inline-offers>
						<Transition name="confirmation-slide">
							<InstanceAiFixWithAiPanel
								v-if="activeFixWithAiOffer"
								:node-name="activeFixWithAiOffer.errors[0].nodeName"
								:error-message="activeFixWithAiOffer.errors[0].errorMessage"
								:failed-count="activeFixWithAiOffer.errors.length"
								@fix-with-ai="handleFixWithAiFromOffer"
								@dismiss="dismissFixWithAiOffer"
							/>
						</Transition>
						<Transition name="confirmation-slide">
							<InstanceAiTestAgentPanel
								v-if="activeTestAgentOffer"
								@generate="handleGenerateTestCasesFromOffer"
								@dismiss="dismissTestAgentOffer"
							/>
						</Transition>
					</template>
				</InstanceAiConversation>

				<!-- Artifacts panel (below header, beside chat) -->
				<Transition :name="artifactsPanelTransitionName" :css="shouldAnimateArtifactsPanel">
					<div
						v-if="showArtifactsPanel"
						ref="artifactsPanelSlot"
						:class="[
							$style.artifactsPanelSlot,
							{ [$style.artifactsPanelSlotOverlay]: !reserveArtifactsPanelLayout },
						]"
						data-test-id="instance-ai-artifacts-sidebar-slot"
					>
						<InstanceAiArtifactsPanel />
					</div>
				</Transition>

				<!-- Overlay panels -->
				<InstanceAiDebugPanel
					v-if="showDebugPanel"
					@close="
						showDebugPanel = false;
						store.debugMode = false;
					"
				/>
			</div>
		</div>

		<!-- Resizable preview panel (workflow OR datatable) -->
		<Transition
			name="preview-panel-slide"
			:css="isPreviewPanelTransitionEnabled"
			@after-enter="handlePreviewPanelAfterEnter"
			@after-leave="handlePreviewPanelAfterLeave"
		>
			<div
				v-show="preview.isPreviewVisible.value"
				:class="[
					$style.canvasArea,
					{
						[$style.canvasAreaExpanded]: isPreviewExpanded,
						[$style.agentPreviewLayoutTransition]: shouldAnimatePreviewLayout,
					},
				]"
				:style="agentPreviewPanelStyle"
				:data-expanded="isPreviewExpanded"
				data-test-id="instance-ai-preview-panel"
			>
				<N8nResizeWrapper
					:width="previewPanelWidth"
					:min-width="previewMinWidth"
					:max-width="previewMaxWidth"
					:supported-directions="['left']"
					:is-resizing-enabled="isPreviewResizeEnabled"
					:grid-size="8"
					@resize="handlePreviewResize"
					@resizestart="isResizingPreview = true"
					@resizeend="isResizingPreview = false"
				>
					<TabsRoot
						:model-value="preview.activeTabId.value"
						orientation="horizontal"
						:class="$style.previewPanel"
						@update:model-value="preview.selectTab"
					>
						<InstanceAiPreviewTabBar
							:tabs="preview.allArtifactTabs.value"
							:active-tab-id="preview.activeTabId.value"
							:is-expanded="isPreviewExpanded"
							:preview-toggle-label="artifactsPreviewToggleLabel"
							@toggle-preview="toggleArtifactsPreview"
							@toggle-expanded="togglePreviewExpanded"
						/>
						<div :class="$style.previewContent">
							<InstanceAiWorkflowPreview
								v-if="preview.isPreviewVisible.value && preview.activeWorkflowId.value"
								:key="preview.activeWorkflowId.value"
								ref="workflowPreview"
								:class="[
									$style.previewSlot,
									{ [$style.previewSlotHidden]: !!preview.activeDataTableId.value },
								]"
								:workflow-id="preview.activeWorkflowId.value"
								:initial-node-id="
									preview.activeWorkflowId.value === agentReturnWorkflowId
										? agentReturnNodeId
										: undefined
								"
								:refresh-key="preview.workflowRefreshKey.value"
								:execution-result="preview.activeWorkflowExecutionResult.value"
								@initial-node-id-consumed="consumeAgentReturnNodeId"
								@workflow-failures="handleWorkflowFailures"
							/>
							<InstanceAiDataTablePreview
								v-if="preview.isPreviewVisible.value && preview.activeDataTableId.value"
								:class="$style.previewSlot"
								:data-table-id="preview.activeDataTableId.value"
								:project-id="preview.activeDataTableProjectId.value"
								:refresh-key="preview.dataTableRefreshKey.value"
							/>
							<InstanceAiAgentPreview
								v-if="
									preview.isPreviewVisible.value &&
									preview.activeAgentId.value &&
									preview.activeAgentProjectId.value
								"
								:class="$style.previewSlot"
								:agent-id="preview.activeAgentId.value"
								:project-id="preview.activeAgentProjectId.value"
								:preview-session-id="activeAgentPreviewSessionId"
								:preview-open="isAgentPreviewDockOpen"
								:pending="preview.activeAgentPending.value"
								@preview-open-change="handleAgentPreviewDockOpenChange"
								@assistant-handoff="handleAgentPreviewAssistantHandoff"
							/>
						</div>
					</TabsRoot>
				</N8nResizeWrapper>
			</div>
		</Transition>
		<!-- Experiment cleanup: remove with openWorkflowInAssistant. -->
		<OpenWorkflowInAssistantNotification :thread-id="threadId" />
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion' as motion;

.threadArea {
	--instance-ai-artifacts-panel-width: 280px;
	--instance-ai-panel-transition-duration: calc(var(--duration--snappy) + 80ms);
	--instance-ai-panel-transition-easing: var(--easing--ease-in-out);

	flex: 1;
	display: flex;
	min-width: 0;
	overflow: hidden;
}

.agentPreviewLayoutTransition {
	--animation--width-transition--duration: var(--duration--snappy);
	--animation--width-transition--easing: var(--easing--ease-in-out);

	@include motion.width-transition;
}

.builderChatHeader {
	flex-shrink: 0;
}

.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-2);
}

.canvasArea {
	flex-shrink: 0;
	min-width: 0;
	border-left: var(--border);
}

.canvasAreaExpanded {
	position: absolute;
	inset: 0;
	z-index: 4;
	border-left: none;
	background-color: var(--color--background--light-2);
}

.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	color: var(--color--text);
}

.activeButton {
	color: var(--color--primary);
}

.reconnecting {
	font-style: italic;
}

.contentArea {
	--instance-ai-artifacts-layout-width: 0;

	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
	transition: --instance-ai-artifacts-layout-width var(--instance-ai-panel-transition-duration)
		var(--instance-ai-panel-transition-easing);
}

.artifactsPanelSlot {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 4;
	width: var(--instance-ai-artifacts-panel-width);
	min-width: var(--instance-ai-artifacts-panel-width);
	display: flex;
	overflow: hidden;
	// Keep the transparent right padding from intercepting the chat scrollbar.
	clip-path: inset(0 var(--spacing--2xs) 0 0);
}

.artifactsPanelSlotOverlay {
	bottom: auto;
	max-height: calc(100% - var(--spacing--sm));
}

.contentAreaWithPinnedArtifacts {
	--instance-ai-artifacts-layout-width: var(--instance-ai-artifacts-panel-width);
}

.contentAreaWithoutLayoutTransitions {
	transition: none;
}

@media (prefers-reduced-motion: reduce) {
	.contentArea {
		transition: none;
	}
}

.previewPanel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.previewContent {
	flex: 1;
	min-height: 0;
	position: relative;
}

.previewSlot {
	position: absolute;
	inset: 0;
}

.previewSlotHidden {
	visibility: hidden;
	pointer-events: none;
}
</style>

<style lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.preview-panel-slide-enter-active,
.preview-panel-slide-leave-active {
	--preview-panel-slide-easing: var(--easing--ease-in-out);

	transition:
		width var(--instance-ai-panel-transition-duration, var(--duration--snappy))
			var(--preview-panel-slide-easing),
		min-width var(--instance-ai-panel-transition-duration, var(--duration--snappy))
			var(--preview-panel-slide-easing),
		opacity var(--instance-ai-panel-transition-duration, var(--duration--snappy))
			var(--preview-panel-slide-easing);
	overflow: hidden;
	will-change: width, min-width, opacity, transform;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
		will-change: auto;
	}
}

.preview-panel-slide-enter-active {
	--animation--fade-in-right--easing: var(--preview-panel-slide-easing);
	--animation--fade-in-right--duration: var(
		--instance-ai-panel-transition-duration,
		var(--duration--snappy)
	);
	--animation--fade-in-right--translate: var(--spacing--sm);

	@include motion.fade-in-right;
}

.preview-panel-slide-leave-active {
	--animation--fade-out-right--easing: var(--preview-panel-slide-easing);
	--animation--fade-out-right--duration: var(
		--instance-ai-panel-transition-duration,
		var(--duration--snappy)
	);
	--animation--fade-out-right--translate: var(--spacing--sm);

	@include motion.fade-out-right;
}

.preview-panel-slide-enter-from,
.preview-panel-slide-leave-to {
	width: 0 !important;
	min-width: 0 !important;
	opacity: 0;
}

.preview-toggle-opacity-enter-active,
.preview-toggle-opacity-leave-active {
	transition: opacity var(--instance-ai-panel-transition-duration, var(--duration--snappy)) linear;
	will-change: opacity;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
		will-change: auto;
	}
}

.preview-toggle-opacity-enter-from,
.preview-toggle-opacity-leave-to {
	opacity: 0;
}

.preview-toggle-opacity-leave-active {
	pointer-events: none;
}

.artifacts-panel-fade-enter-active,
.artifacts-panel-fade-leave-active {
	--artifacts-panel-slide-enter-easing: var(--easing--ease-out);
	--artifacts-panel-slide-exit-easing: var(--easing--ease-in);
	--animation--fade-in-right--duration: var(
		--instance-ai-panel-transition-duration,
		var(--duration--snappy)
	);
	--animation--fade-in-right--easing: var(--artifacts-panel-slide-enter-easing);
	--animation--fade-in-right--translate: 100%;
	--animation--fade-out-right--duration: var(
		--instance-ai-panel-transition-duration,
		var(--duration--snappy)
	);
	--animation--fade-out-right--easing: var(--artifacts-panel-slide-exit-easing);
	--animation--fade-out-right--translate: 100%;

	will-change: opacity, transform;

	@media (prefers-reduced-motion: reduce) {
		will-change: auto;
	}
}

.artifacts-panel-preview-enter-active,
.artifacts-panel-preview-leave-active {
	transition: opacity var(--instance-ai-panel-transition-duration, var(--duration--snappy)) linear;

	will-change: opacity;

	@media (prefers-reduced-motion: reduce) {
		will-change: auto;
	}
}

.artifacts-panel-preview-enter-from,
.artifacts-panel-preview-leave-to {
	opacity: 0;
}

.artifacts-panel-fade-enter-active {
	@include motion.fade-in-right;
}

.artifacts-panel-fade-leave-active {
	@include motion.fade-out-right;
	pointer-events: none;
}

.artifacts-panel-preview-leave-active {
	pointer-events: none;
}
</style>
