<script lang="ts" setup>
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	provide,
	ref,
	shallowReactive,
	useTemplateRef,
	watch,
} from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import {
	N8nHeading,
	N8nIconButton,
	N8nResizeWrapper,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { onClickOutside, useElementSize, useScroll, useWindowSize } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type {
	InstanceAiAgentAttachment,
	InstanceAiAttachment,
	InstanceAiHandoffContext,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { COLLAPSED_MAIN_SIDEBAR_WIDTH, useSidebarLayout } from '@/app/composables/useSidebarLayout';
// Experiment cleanup: remove with openWorkflowInAssistant.
import { useOpenWorkflowInAssistantStore } from '@/experiments/openWorkflowInAssistant/stores/openWorkflowInAssistant.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { countAttachedNodes } from './utils/buildNodesAttachment';
import { useToast } from '@n8n/composables/useToast';
import { provideThread, useInstanceAiStore } from './instanceAi.store';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getAgentPreviewSessionFromThreadMetadata,
	getAgentPreviewViewFromThreadMetadata,
} from './instanceAi.threadRuntime';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { isPendingItemFloating } from './confirmationKinds';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { useCanvasPreview } from './useCanvasPreview';
import { useCreditWarningBanner } from './composables/useCreditWarningBanner';
import {
	buildInstanceAiAgentPreviewHandoffContext,
	clearPendingAgentAttachment,
	consumePendingDraftAttachment,
	clearPendingComposerDraft,
	clearPendingHandoffContext,
	clearPendingThreadHandoff,
	consumePendingFirstMessage,
	getPendingAgentAttachment,
	getPendingComposerDraft,
	getPendingHandoffContext,
	stashPendingComposerDraft,
	stashPendingHandoffContext,
} from './composables/useInstanceAiHandoff';
import type { AgentPreviewHandoffParams } from './composables/useInstanceAiAgentPreviewHandoff';
import { useTransitionGate } from './useTransitionGate';
import {
	INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY,
	INSTANCE_AI_VIEW,
	NEW_CONVERSATION_TITLE,
} from './constants';
import {
	agentPreviewContextIcon,
	formatAgentPreviewContextLabel,
	getDismissedContextKeys,
	handoffContextKey,
} from './instanceAi.handoffContext';
import { useSidebarState } from './instanceAiLayout';
import InstanceAiMessage from './components/InstanceAiMessage.vue';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiDebugPanel from './components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from './components/InstanceAiArtifactsPanel.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './components/InstanceAiConfirmationPanel.vue';
import InstanceAiFixWithAiPanel from './components/InstanceAiFixWithAiPanel.vue';
import InstanceAiTestAgentPanel from './components/InstanceAiTestAgentPanel.vue';
import InstanceAiPreviewTabBar from './components/InstanceAiPreviewTabBar.vue';
import AgentTemplateSuggestions from '@/features/agents/components/AgentTemplateSuggestions.vue';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
import type { AgentTemplate } from '@/features/agents/agentTemplates';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import WorkflowBuilderUnavailableNotice from './components/WorkflowBuilderUnavailableNotice.vue';
import AgentSection from './components/AgentSection.vue';
import { collectActiveBuilderAgents, messageHasVisibleContent } from './builderAgents';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
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

const props = defineProps<{
	threadId: string;
}>();

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const thread = provideThread(props.threadId);
const { showCreditWarning, quotaLocked } = storeToRefs(store);
const rootStore = useRootStore();
const i18n = useI18n();
const router = useRouter();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(showCreditWarning);
const sidebar = useSidebarState();
const { width: windowWidth } = useWindowSize();
const { isCollapsed: isMainSidebarCollapsed, sidebarWidth: mainSidebarWidth } = useSidebarLayout();
const telemetry = useTelemetry();
const toast = useToast();
const pendingComposerContext = ref<InstanceAiHandoffContext | null>(null);
const pendingComposerDraft = ref<string | null>(null);
const generatedComposerDraft = ref<string | null>(null);
const pendingAgentAttachment = ref<InstanceAiAgentAttachment | null>(null);
const currentAgentAttachment = computed<InstanceAiAgentAttachment | null>(() => {
	const queued = pendingAgentAttachment.value;
	if (!queued) return null;

	const boundTarget = getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(thread.id));
	if (
		boundTarget?.agentId !== queued.id ||
		boundTarget.projectId !== queued.projectId ||
		!queued.pending
	) {
		return queued;
	}

	const name = boundTarget.name ?? queued.name;
	return {
		type: 'agent',
		id: queued.id,
		projectId: queued.projectId,
		...(name ? { name } : {}),
	};
});

// Running builders render in a dedicated bottom section of the conversation.
// Once a builder finishes it falls out of this list and AgentTimeline renders
// it in its natural chronological slot.
const builderAgents = computed(() => collectActiveBuilderAgents(thread.messages));

// Assistant messages whose only content has been extracted to the bottom
// builder section (or which haven't produced anything renderable yet) would
// otherwise leave an empty wrapper in the list — filter them out.
// Reconciled in place: spliced only when membership changes, so streamed
// tokens don't re-render the list.
const displayedMessages = shallowReactive<typeof thread.messages>([]);
watch(
	() => thread.messages.filter(messageHasVisibleContent),
	(next) => {
		const unchanged =
			next.length === displayedMessages.length &&
			next.every((msg, i) => msg === displayedMessages[i]);
		if (!unchanged) displayedMessages.splice(0, displayedMessages.length, ...next);
	},
	{ immediate: true },
);

// Show the input disclaimer only once the AI has produced a visible response.
const hasAssistantResponse = computed(() => displayedMessages.some((m) => m.role === 'assistant'));

// True when at least one pending confirmation should occupy the chat-input
// slot (questions, generic approvals, or domain/web-search access). Drives
// the swap between the input and the floating confirmation panel.
const hasFloatingConfirmation = computed(() =>
	thread.pendingConfirmations.some(isPendingItemFloating),
);

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
const currentThreadTitle = computed<string | undefined>(() => {
	const threadSummary = store.threads.find((t) => t.id === props.threadId);
	if (threadSummary?.title && threadSummary.title !== NEW_CONVERSATION_TITLE) {
		return threadSummary.title;
	}
	const firstUserMsg = thread.messages.find((m) => m.role === 'user');
	if (firstUserMsg?.content) {
		const text = firstUserMsg.content.trim();
		return text.length > 60 ? text.slice(0, 60) + '…' : text;
	}
	return undefined;
});

// The tab names the conversation, not the workflow previewed inside it — the
// parent view claims the title so the embedded canvas can't overwrite this.
const documentTitle = useDocumentTitle();
watch(
	currentThreadTitle,
	(title) => documentTitle.set(title ?? i18n.baseText('instanceAi.view.title')),
	{ immediate: true },
);

// --- Canvas / data table preview ---
const preview = useCanvasPreview({
	thread,
	threadId: () => props.threadId,
	initialAgentId: () =>
		getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(props.threadId))?.agentId,
});
const activeAgentPreviewSessionId = computed(() => {
	const context = pendingComposerContext.value;
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
provide('pendingComposerContext', pendingComposerContext);
provide('dismissPendingComposerContext', dismissPendingComposerContext);

// Focus the composer when plan-edit mode is entered. The thread runtime
// owns the activePlanEdit state; this watcher just reacts to the transition.
watch(
	() => thread.activePlanEdit,
	(next, prev) => {
		if (next && !prev) {
			void nextTick(() => chatInputRef.value?.focus());
		}
	},
);

// --- Side panels ---
const showDebugPanel = ref(false);

// Template suggestions appear above the chat on a fresh, pending agent with
// no visible messages. They disappear once the user picks one.
const showAgentTemplateSuggestions = computed(
	() =>
		displayedMessages.length === 0 &&
		preview.activeAgentPending.value &&
		preview.activeAgentId.value !== null,
);
const agentTemplateSuggestionsDismissed = ref(false);
const canShowAgentTemplateSuggestions = computed(
	() => showAgentTemplateSuggestions.value && !agentTemplateSuggestionsDismissed.value,
);

function handleAgentTemplateSelect(template: AgentTemplate) {
	const agentId = preview.activeAgentId.value;
	if (!agentId) return;
	agentTemplateSuggestionsDismissed.value = true;
	telemetry.track('User clicked agent template', {
		template_id: template.id,
		agent_id: agentId,
	});
	agentsEventBus.emit('applyTemplate', {
		agentId,
		config: template.config,
		connectedTriggers: template.connectedTriggers,
	});
}

// Reset the dismissed flag when the conditions for showing suggestions no
// longer hold, so a subsequent fresh agent shows them again.
watch(
	() => showAgentTemplateSuggestions.value,
	(show) => {
		if (!show) agentTemplateSuggestionsDismissed.value = false;
	},
);

// Track once when the template suggestions first become visible.
watch(
	() => canShowAgentTemplateSuggestions.value,
	(visible) => {
		if (visible) {
			telemetry.track('User viewed agent templates', {
				agent_id: preview.activeAgentId.value,
			});
		}
	},
);

const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');
const hasPreviewTabs = computed(() => preview.allArtifactTabs.value.length > 0);
const isArtifactsPanelRevealed = ref(false);
const isArtifactsPanelDismissedInLayout = ref(false);
const DEFAULT_INSTANCE_AI_SIDEBAR_WIDTH = 260;
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
const instanceAiSidebarOccupiedWidth = computed(() =>
	sidebar.collapsed.value ? 0 : (sidebar.width?.value ?? DEFAULT_INSTANCE_AI_SIDEBAR_WIDTH),
);
const availableWidthForPinnedArtifactsPanel = computed(
	() => windowWidth.value - mainSidebarOccupiedWidth.value - instanceAiSidebarOccupiedWidth.value,
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
const preferredPreviewPanelWidth = ref(Math.round(threadAreaWidth.value / 2));
const isResizingPreview = ref(false);
const isPreviewExpanded = ref(false);
const isAgentPreviewDockOpen = ref(false);

watch(preview.activeTabId, (activeTabId, previousActiveTabId) => {
	if (activeTabId !== previousActiveTabId) {
		isAgentPreviewDockOpen.value = false;
	}
});

const previewMaxWidth = computed(() => Math.round(threadAreaWidth.value * 0.7));
// Preserve the default or manually selected width while temporarily
// constraining it to the available space.
const previewPanelWidth = computed(() =>
	Math.min(preferredPreviewPanelWidth.value, previewMaxWidth.value),
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
	preferredPreviewPanelWidth.value = width;
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

		if (visible) {
			isArtifactsPanelRevealed.value = false;
			preferredPreviewPanelWidth.value = previewMaxWidth.value;
		} else {
			isAgentPreviewDockOpen.value = false;
		}
	},
	{ flush: 'sync' },
);

// Late-initialize if the panel became visible before the ResizeObserver
// reported the container size (otherwise the panel would render at 0px).
watch(threadAreaWidth, (width) => {
	if (width > 0 && preferredPreviewPanelWidth.value === 0 && preview.isPreviewVisible.value) {
		preferredPreviewPanelWidth.value = previewMaxWidth.value;
	}
});

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

// --- Scroll management ---
const scrollableRef = useTemplateRef<HTMLElement>('scrollable');
// The actual scroll container is the reka-ui viewport inside N8nScrollArea,
// NOT the immediate parent (which is a non-scrolling content wrapper).
const scrollContainerRef = computed(
	() =>
		(scrollableRef.value?.closest('[data-reka-scroll-area-viewport]') as HTMLElement | null) ??
		null,
);
const { arrivedState } = useScroll(scrollContainerRef, {
	throttle: 100,
	offset: { bottom: 100 },
});
const userScrolledUp = ref(false);

watch(
	() => arrivedState.bottom,
	(atBottom) => {
		userScrolledUp.value = !atBottom;
	},
);

function scrollToBottom(smooth = false) {
	const container = scrollContainerRef.value;
	if (container) {
		container.scrollTo({
			top: container.scrollHeight,
			behavior: smooth ? 'smooth' : 'instant',
		});
	}
}

// Auto-scroll when content height changes (handles text deltas, tool calls,
// sub-agent spawns, results, etc. — anything that grows the DOM).
let contentResizeObserver: ResizeObserver | null = null;

watch(
	scrollableRef,
	(el) => {
		contentResizeObserver?.disconnect();
		if (el) {
			contentResizeObserver = new ResizeObserver(() => {
				if (!userScrolledUp.value) {
					scrollToBottom();
				}
			});
			contentResizeObserver.observe(el);
		}
	},
	{ immediate: true },
);

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

function focusChatInputIfFocusIsIdle() {
	const activeElement = document.activeElement;
	if (
		activeElement instanceof HTMLElement &&
		activeElement !== document.body &&
		activeElement !== document.documentElement
	) {
		return;
	}

	chatInputRef.value?.focus();
}

// Focus input on initial render (ref rebinds when messages load)
watch(chatInputRef, (el) => {
	if (el) {
		void nextTick(focusChatInputIfFocusIsIdle);
	}
});

watch(
	() => store.composerFocusRequest,
	() => {
		isPreviewExpanded.value = false;
		void nextTick(() => chatInputRef.value?.focus());
	},
);

watch(
	[chatInputRef, pendingComposerDraft, () => thread.activePlanEdit],
	([input, draft, planEdit]) => {
		if (!input || !draft || planEdit) return;
		input.setText(draft);
		generatedComposerDraft.value = draft;
		pendingComposerDraft.value = null;
		void nextTick(focusChatInputIfFocusIsIdle);
	},
);

// Reset scroll state when switching threads so new content auto-scrolls.
watch(
	() => props.threadId,
	(threadId, previousThreadId) => {
		if (threadId !== previousThreadId) {
			userScrolledUp.value = false;
			void nextTick(focusChatInputIfFocusIsIdle);
		}
	},
);

function isCurrentThreadRuntime(): boolean {
	return store.getRuntime(props.threadId) === thread;
}

const composerContextChip = computed(() => {
	const agentAttachment = currentAgentAttachment.value;
	if (agentAttachment && pendingComposerContext.value?.source !== 'agent-preview') {
		return {
			key: `pending-agent:${agentAttachment.id}`,
			label: agentAttachment.name ?? i18n.baseText('agents.new.defaultName'),
			icon: 'robot',
			isPending: true,
		};
	}

	if (pendingComposerContext.value?.source === 'agent-preview') {
		return {
			key: handoffContextKey(pendingComposerContext.value),
			label: formatAgentPreviewContextLabel(
				pendingComposerContext.value,
				(textKey, options) => i18n.baseText(textKey, options),
				thread.producedArtifacts.get(pendingComposerContext.value.agentId)?.name,
			),
			icon: agentPreviewContextIcon(pendingComposerContext.value.agentIcon),
			isPending: true,
		};
	}

	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	for (const message of [...thread.messages].reverse()) {
		if (message.role !== 'user' || message.context?.source !== 'agent-preview') continue;

		const key = handoffContextKey(message.context);
		if (dismissedKeys.has(key)) continue;

		return {
			key,
			label: formatAgentPreviewContextLabel(
				message.context,
				(textKey, options) => i18n.baseText(textKey, options),
				thread.producedArtifacts.get(message.context.agentId)?.name,
			),
			icon: agentPreviewContextIcon(message.context.agentIcon),
			isPending: false,
		};
	}

	return null;
});

function reconnectThreadAfterHydration(): void {
	const agentAttachment = getPendingAgentAttachment(props.threadId);
	if (agentAttachment) {
		pendingAgentAttachment.value = agentAttachment;
		preview.openAgentPreview(agentAttachment.id, agentAttachment.projectId);
	}
	const draftAttachment = consumePendingDraftAttachment(props.threadId);
	if (draftAttachment) store.stageNodeSets(draftAttachment.workflowId, draftAttachment.sets);
	void thread.loadHistoricalMessages().then(async (hydrationStatus) => {
		if (hydrationStatus === 'stale') return;
		await thread.loadThreadStatus();
		if (!isCurrentThreadRuntime()) return;
		thread.connectSSE();
		// Replay an opening message handed off from another tab (e.g. credential help
		// opened in a new tab) as if typed here, so it shows and streams in this runtime.
		const pending = consumePendingFirstMessage(props.threadId);
		if (pending) {
			void thread.sendMessage(
				pending.message,
				pending.attachments,
				rootStore.pushRef,
				pending.context,
			);
			// Experiment cleanup: remove with openWorkflowInAssistant.
			useOpenWorkflowInAssistantStore().handleRedirectLanding(props.threadId);
		}
	});
}

// Validate the route's :threadId against the loaded thread list, then connect
// this route-scoped runtime. Route changes remount this component, so no
// store-level "active thread" state is needed here.
async function syncRouteToStore() {
	const requestedThreadId = props.threadId;
	// Apply preview/credential composer state synchronously so a quick first
	// submit cannot race past it while the thread list is still loading.
	pendingComposerContext.value = getPendingHandoffContext(requestedThreadId);
	pendingComposerDraft.value = getPendingComposerDraft(requestedThreadId);
	if (!store.threads.length) {
		await store.loadThreads();
	}
	// User may have navigated elsewhere while we awaited
	if (requestedThreadId !== props.threadId) return;
	if (!store.threads.some((t) => t.id === requestedThreadId)) {
		clearPendingThreadHandoff(requestedThreadId);
		void router.replace({ name: INSTANCE_AI_VIEW });
		return;
	}
	if (thread.sseState === 'disconnected') {
		reconnectThreadAfterHydration();
	}
}

onMounted(() => {
	enablePanelTransitionsAfterStableRender();

	void syncRouteToStore();

	void nextTick(focusChatInputIfFocusIsIdle);
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
	contentResizeObserver?.disconnect();
});

const workflowPreviewRef =
	useTemplateRef<InstanceType<typeof InstanceAiWorkflowPreview>>('workflowPreview');

// --- Message handlers ---
function handleSubmit(
	message: string,
	attachments?: InstanceAiAttachment[],
	restoreDraft?: () => boolean,
) {
	if (!settingsStore.isWorkflowBuilderAvailable) {
		return;
	}

	// Reset scroll on new user message
	userScrolledUp.value = false;

	const planEdit = thread.activePlanEdit;
	if (planEdit) {
		thread.cancelPlanEdit();
		telemetry.track('User finished providing input', {
			thread_id: thread.id,
			input_thread_id: planEdit.inputThreadId ?? '',
			instance_id: rootStore.instanceId,
			type: 'plan-review',
			provided_inputs: [
				{
					label: 'plan',
					options: ['approve', 'ask-for-edits', 'deny'],
					option_chosen: 'ask-for-edits',
				},
			],
			skipped_inputs: [],
			num_tasks: planEdit.taskCount,
			feedback: scrubSecretsInText(message),
			plan_feedback_type: 'changes_requested',
		});
		thread.markPlanUpdatePending(planEdit.requestId);
		void thread
			.confirmAction(planEdit.requestId, {
				kind: 'approval',
				approved: false,
				userInput: message,
			})
			.then((success) => {
				if (success) {
					thread.resolveConfirmation(planEdit.requestId, 'changes-requested');
				} else {
					thread.clearPlanUpdatePending(planEdit.requestId);
				}
			});
		return;
	}

	const handoffContext = pendingComposerContext.value ?? undefined;
	const submittedGeneratedDraft = generatedComposerDraft.value;
	const queuedAgentAttachment = pendingAgentAttachment.value;
	const agentAttachment = currentAgentAttachment.value;
	const submittedAttachments = agentAttachment
		? [...(attachments ?? []), agentAttachment]
		: attachments;

	const nodeCount = countAttachedNodes(attachments);

	void thread
		.sendMessage(message, submittedAttachments, rootStore.pushRef, handoffContext)
		.then((sent) => {
			if (!sent) {
				if (restoreDraft?.()) return;
				const input = chatInputRef.value;
				if (input && !input.isDirty()) input.setText(message);
				return;
			}
			// Track message-with-nodes only after a successful send, so failed
			// sends and retries don't inflate the node-count metric.
			if (nodeCount > 0) {
				telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
					node_count: nodeCount,
				});
			}
			// Clear the canvas selection only once the send succeeded — clearing it
			// up front loses the selection on a failed send that the user retries.
			if (submittedAttachments?.some((a) => a.type === 'nodes')) {
				store.requestClearCanvasSelection();
			}
			const isCurrentHandoff = !handoffContext || pendingComposerContext.value === handoffContext;
			const isCurrentDraft =
				!submittedGeneratedDraft || generatedComposerDraft.value === submittedGeneratedDraft;
			if ((handoffContext || submittedGeneratedDraft) && isCurrentHandoff && isCurrentDraft) {
				clearPendingHandoffContext(props.threadId);
				clearPendingComposerDraft(props.threadId);
				if (handoffContext) pendingComposerContext.value = null;
				if (submittedGeneratedDraft) generatedComposerDraft.value = null;
			}
			if (queuedAgentAttachment && pendingAgentAttachment.value === queuedAgentAttachment) {
				clearPendingAgentAttachment(props.threadId);
				pendingAgentAttachment.value = null;
			}
		});
}

function handleStop() {
	void thread.cancelRun();
}

function handleFixWithAiFromOffer() {
	const offer = activeFixWithAiOffer.value;
	if (!offer) return;

	dismissedExecutionId.value = offer.executionId;
	userScrolledUp.value = false;
	void thread.sendMessage(
		buildFixWithAiPrompt({ workflowName: offer.workflowName, errors: offer.errors }),
		undefined,
		rootStore.pushRef,
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
	if (chatInputRef.value?.isDirty()) {
		toast.showMessage({
			title: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.title'),
			message: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.message'),
			type: 'warning',
		});
		return;
	}

	const context = buildInstanceAiAgentPreviewHandoffContext(params);
	stashPendingHandoffContext(props.threadId, context);
	pendingComposerContext.value = context;

	void store
		.updateThreadMetadata(thread.id, {
			[INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
				agentId: params.agentId,
				threadId: params.threadId,
			},
		})
		.catch((error: unknown) => {
			toast.showError(error, i18n.baseText('generic.error'));
		});
	if (params.initialDraft) {
		stashPendingComposerDraft(props.threadId, params.initialDraft);
		pendingComposerDraft.value = params.initialDraft;
	} else {
		const generatedDraft = generatedComposerDraft.value;
		if (generatedDraft) chatInputRef.value?.clearTextIfMatches(generatedDraft);
		clearPendingComposerDraft(props.threadId);
		pendingComposerDraft.value = null;
		generatedComposerDraft.value = null;
	}

	if (!thread.activePlanEdit) {
		void nextTick(() => chatInputRef.value?.focus());
	}
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

function clearPendingComposerHandoff() {
	const draft = generatedComposerDraft.value ?? pendingComposerDraft.value;
	if (draft) chatInputRef.value?.clearTextIfMatches(draft);
	pendingComposerDraft.value = null;
	generatedComposerDraft.value = null;
	pendingComposerContext.value = null;
	clearPendingHandoffContext(props.threadId);
	clearPendingComposerDraft(props.threadId);
}

function dismissPendingComposerContext(key: string): boolean {
	const context = pendingComposerContext.value;
	if (!context || handoffContextKey(context) !== key) return false;
	clearPendingComposerHandoff();
	return true;
}

async function dismissComposerContextChip() {
	if (!composerContextChip.value) return;

	if (pendingAgentAttachment.value && pendingComposerContext.value?.source !== 'agent-preview') {
		clearPendingAgentAttachment(props.threadId);
		pendingAgentAttachment.value = null;
		return;
	}

	if (composerContextChip.value.isPending) {
		clearPendingComposerHandoff();
		return;
	}

	const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
	dismissedKeys.add(composerContextChip.value.key);
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
					[$style.agentPreviewLayoutTransition]: isPreviewPanelTransitionEnabled,
				},
			]"
			:data-layout-animated="isPreviewPanelTransitionEnabled"
			data-test-id="instance-ai-builder-chat"
		>
			<div :class="$style.builderChatHeader" data-test-id="instance-ai-builder-chat-header">
				<InstanceAiViewHeader>
					<template #title>
						<N8nHeading
							v-if="currentThreadTitle"
							tag="h2"
							size="small"
							:class="[
								$style.headerTitle,
								{ [$style.headerTitleWithSidebar]: !sidebar.collapsed.value },
							]"
						>
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
				<div :class="$style.chatContent">
					<AgentTemplateSuggestions
						v-if="canShowAgentTemplateSuggestions"
						@select="handleAgentTemplateSelect"
					/>
					<N8nScrollArea as-child type="auto" :class="$style.scrollArea">
						<div ref="scrollable" :class="$style.scrollContent">
							<div :class="$style.messageList">
								<TransitionGroup name="message-slide">
									<InstanceAiMessage
										v-for="message in displayedMessages"
										:key="message.id"
										:message="message"
									/>
								</TransitionGroup>
								<!-- Builder sub-agents are extracted from their parent assistant
	     messages and rendered here so they always sit at the bottom
	     of the conversation. -->
								<div v-if="builderAgents.length" :class="$style.builderAgents">
									<AgentSection
										v-for="builder in builderAgents"
										:key="builder.agentId"
										:agent-node="builder"
									/>
								</div>
								<!-- Inline confirmations (plan review, text, setup, credential,
									 gateway resource-decision, continue) render in
									 the chat flow. Floating-eligible items take over the chat
									 input slot below instead - see `hasFloatingConfirmation`. -->
								<InstanceAiConfirmationPanel kind="inline" />

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
								<!-- Live activity indicator. Sits at the very end of the
									 conversation flow — below any pending questions/confirmations
									 and not pinned above the input — so it trails the active
									 content and scrolls away when reading back. -->
								<InstanceAiStatusBar />
							</div>

							<!-- Floating input slot - replaced by the confirmation panel while a
								 floating interaction is pending. The credit banner stays
								 anchored above the slot in both states. The leaving child is
								 positioned absolutely during the cross-fade so the in-flow child
								 can size the slot to its natural height. -->
							<div :class="$style.inputDock">
								<!-- Scroll to bottom button -->
								<div :class="$style.scrollButtonContainer">
									<Transition name="scroll-button-fade">
										<N8nIconButton
											v-if="userScrolledUp && thread.hasMessages"
											variant="outline"
											icon="arrow-down"
											size="large"
											icon-size="large"
											:class="$style.scrollToBottomButton"
											@click="
												scrollToBottom(true);
												userScrolledUp = false;
											"
										/>
									</Transition>
								</div>

								<div :class="$style.inputContainer">
									<div :class="$style.inputConstraint">
										<WorkflowBuilderUnavailableNotice
											v-if="!settingsStore.isWorkflowBuilderAvailable"
										/>
										<CreditWarningBanner
											v-if="creditBanner.visible.value"
											:credits-remaining="store.creditsRemaining"
											:credits-quota="store.creditsQuota"
											:amounts-hidden="quotaLocked"
											@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
											@dismiss="creditBanner.dismiss()"
										/>
										<div :class="$style.inputSwap">
											<Transition name="input-swap">
												<InstanceAiConfirmationPanel
													v-if="hasFloatingConfirmation"
													key="floating-confirmation"
													kind="floating"
												/>
												<InstanceAiInput
													v-else
													ref="chatInputRef"
													key="chat-input"
													:is-streaming="thread.isStreaming"
													:is-submitting="thread.isSendingMessage"
													:is-awaiting-confirmation="thread.isAwaitingConfirmation"
													:is-plan-edit-mode="thread.activePlanEdit !== null"
													:is-workflow-builder-available="settingsStore.isWorkflowBuilderAvailable"
													:current-thread-id="thread.id"
													:amend-context="thread.amendContext"
													:context-chip="composerContextChip"
													:contextual-suggestion="thread.contextualSuggestion"
													@submit="handleSubmit"
													@stop="handleStop"
													@cancel-plan-edit="thread.cancelPlanEdit"
													@dismiss-context-chip="dismissComposerContextChip"
												/>
											</Transition>
										</div>
										<p v-if="hasAssistantResponse" :class="$style.disclaimer">
											{{ i18n.baseText('instanceAi.input.disclaimer') }}
										</p>
									</div>
								</div>
							</div>
						</div>
					</N8nScrollArea>
				</div>

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
						[$style.agentPreviewLayoutTransition]:
							isPreviewPanelTransitionEnabled && !isResizingPreview,
					},
				]"
				:style="agentPreviewPanelStyle"
				:data-expanded="isPreviewExpanded"
				data-test-id="instance-ai-preview-panel"
			>
				<N8nResizeWrapper
					:width="previewPanelWidth"
					:min-width="400"
					:max-width="previewMaxWidth"
					:supported-directions="['left']"
					:is-resizing-enabled="!isPreviewExpanded"
					:grid-size="8"
					@resize="handlePreviewResize"
					@resizestart="isResizingPreview = true"
					@resizeend="isResizingPreview = false"
				>
					<TabsRoot
						v-model="preview.activeTabId.value"
						orientation="horizontal"
						:class="$style.previewPanel"
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
								:refresh-key="preview.workflowRefreshKey.value"
								:execution-result="preview.activeWorkflowExecutionResult.value"
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

@property --instance-ai-artifacts-layout-width {
	syntax: '<length>';
	inherits: true;
	initial-value: 0;
}

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

.headerTitleWithSidebar {
	padding-left: var(--spacing--4xs);
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

.chatContent {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	position: relative;
}

.scrollArea {
	flex: 1;
	// Allow flex item to shrink below content size so reka-ui viewport scrolls
	min-height: 0;

	:global([data-orientation='vertical'][data-orientation='vertical']) {
		background: transparent;
		padding: 0;
		// Sit above the sticky input dock (z-index: 3) so its gradient doesn't cover the scrollbar
		z-index: 4;
	}

	:global([data-orientation='vertical'][data-orientation='vertical'] > *) {
		background: light-dark(var(--color--neutral-400), var(--color--neutral-600));

		&:hover {
			background: light-dark(var(--color--neutral-500), var(--color--neutral-500));
		}
	}
}

.scrollContent {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
}

.messageList {
	width: calc(100% - var(--instance-ai-artifacts-layout-width));
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--sm) var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
}

.contentAreaWithPinnedArtifacts {
	--instance-ai-artifacts-layout-width: var(--instance-ai-artifacts-panel-width);
}

.contentAreaWithoutLayoutTransitions {
	transition: none;

	.messageList,
	.scrollButtonContainer,
	.inputConstraint {
		transition: none;
	}
}

.builderAgents {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.inputDock {
	position: sticky;
	bottom: 0;
	margin-top: auto;
	z-index: 3;
	pointer-events: none;
}

.scrollButtonContainer {
	display: flex;
	justify-content: center;
	pointer-events: none;
	margin-bottom: var(--spacing--sm);
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
}

.scrollToBottomButton {
	--button--color: var(--icon-color--strong);
	--button--color--background: var(--background--surface);
	--button--color--background-hover: var(--color--foreground--tint-2);
	--button--color--background-active: var(--color--foreground--tint-2);
	--button--shadow: var(--shadow--xs);
	--button--shadow--hover: var(--shadow--xs);
	--button--shadow--active: var(--shadow--xs);
	--button--border-color: var(--border-color);
	--button--border-color--hover: var(--border-color);
	--button--border-color--active: var(--border-color);
	--button--border--shadow: 0 0 0 1px var(--button--border-color);
	--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
	--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	--button--radius: var(--radius--full);

	pointer-events: auto;

	&.scrollToBottomButton {
		background-color: var(--background--surface);
		border: var(--border);
		border-radius: var(--radius--full);
		box-shadow: var(--shadow--xs);
		color: var(--icon-color--strong);

		&:hover {
			background-color: var(--color--foreground--tint-2);
			box-shadow: var(--shadow--xs);
		}
	}
}

.inputContainer {
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
	pointer-events: none;

	& > * {
		pointer-events: auto;
	}
}

.inputConstraint {
	width: calc(100% - var(--instance-ai-artifacts-layout-width));
	max-width: 750px;
	margin: 0 auto;
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.disclaimer {
	margin: 0;
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

@media (prefers-reduced-motion: reduce) {
	.contentArea,
	.messageList,
	.scrollButtonContainer,
	.inputConstraint {
		transition: none;
	}
}

// The leaving child is detached from layout (see `.input-swap-leave-active`
// below) so the slot follows the entering child's intrinsic height during
// the cross-fade.
.inputSwap {
	position: relative;
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

.message-slide-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.message-slide-enter-active {
	transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s ease;
}

.scroll-button-fade-enter-from,
.scroll-button-fade-leave-to {
	opacity: 0;
}

.scroll-button-fade-enter-active,
.scroll-button-fade-leave-active {
	transition: opacity 0.12s ease;
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

// Cross-fade between the chat input and the floating confirmation panel.
// Default-mode cross-fade: both children co-exist briefly, the leaving one
// is absolute-positioned so it doesn't push the entering one down, and the
// slot sizes to the in-flow (entering) child.
.input-swap-enter-from,
.input-swap-leave-to {
	opacity: 0;
}

.input-swap-enter-active,
.input-swap-leave-active {
	transition: opacity 120ms ease;
}

.input-swap-leave-active {
	position: absolute;
	inset: 0;
}
</style>
