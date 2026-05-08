<script lang="ts" setup>
import {
	computed,
	nextTick,
	onMounted,
	onUnmounted,
	provide,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import {
	N8nHeading,
	N8nIconButton,
	N8nCallout,
	N8nResizeWrapper,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useScroll, useSessionStorage, useWindowSize } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { COLLAPSED_MAIN_SIDEBAR_WIDTH, useSidebarLayout } from '@/app/composables/useSidebarLayout';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { useCanvasPreview } from './useCanvasPreview';
import { useEventRelay } from './useEventRelay';
import { useExecutionPushEvents } from './useExecutionPushEvents';
import { useTransitionGate } from './useTransitionGate';
import { INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW, NEW_CONVERSATION_TITLE } from './constants';
import { INSTANCE_AI_EMPTY_STATE_SUGGESTIONS } from './emptyStateSuggestions';
import InstanceAiMessage from './components/InstanceAiMessage.vue';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiThreadList from './components/InstanceAiThreadList.vue';
import InstanceAiDebugPanel from './components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from './components/InstanceAiArtifactsPanel.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './components/InstanceAiConfirmationPanel.vue';
import InstanceAiPreviewTabBar from './components/InstanceAiPreviewTabBar.vue';
import AgentSection from './components/AgentSection.vue';
import { collectActiveBuilderAgents, messageHasVisibleContent } from './builderAgents';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import InstanceAiWorkflowPreview from './components/InstanceAiWorkflowPreview.vue';
import InstanceAiDataTablePreview from './components/InstanceAiDataTablePreview.vue';
import { TabsRoot } from 'reka-ui';

const props = defineProps<{
	threadId?: string;
}>();

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const sourceControlStore = useSourceControlStore();
const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);
const rootStore = useRootStore();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { goToUpgrade } = usePageRedirectionHelper();
const { isCollapsed: isMainSidebarCollapsed, sidebarWidth: mainSidebarWidth } = useSidebarLayout();

documentTitle.set(i18n.baseText('instanceAi.view.title'));

// Running builders render in a dedicated bottom section of the conversation.
// Once a builder finishes it falls out of this list and AgentTimeline renders
// it in its natural chronological slot.
const builderAgents = computed(() => collectActiveBuilderAgents(store.messages));

// Assistant messages whose only content has been extracted to the bottom
// builder section (or which haven't produced anything renderable yet) would
// otherwise leave an empty wrapper in the list — filter them out.
const displayedMessages = computed(() => store.messages.filter(messageHasVisibleContent));

// --- Execution tracking via push events ---
const executionTracking = useExecutionPushEvents();

// --- Header title ---
// Returns the resolved title once we have one, or undefined while we're still
// figuring out which thread to show. Rendering only on a defined value avoids
// the "New conversation" \u2192 real title flash when resuming a recent thread.
const currentThreadTitle = computed<string | undefined>(() => {
	const thread = store.threads.find((t) => t.id === store.currentThreadId);
	if (thread && thread.title && thread.title !== NEW_CONVERSATION_TITLE) {
		return thread.title;
	}
	const firstUserMsg = store.messages.find((m) => m.role === 'user');
	if (firstUserMsg?.content) {
		const text = firstUserMsg.content.trim();
		return text.length > 60 ? text.slice(0, 60) + '\u2026' : text;
	}
	return undefined;
});

// --- Canvas / data table preview ---
const preview = useCanvasPreview({
	store,
	route,
});

provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);

// --- Credit warning banner ---
const creditBannerDismissed = ref(false);
watch(
	() => store.isLowCredits,
	(isLow, wasLow) => {
		// Only reset dismissal when transitioning INTO low-credits state
		// (e.g. from >10% to <=10%). Subsequent push updates within the
		// low-credits zone should not re-show a dismissed banner.
		if (isLow && !wasLow) {
			creditBannerDismissed.value = false;
		}
	},
);
const showCreditBanner = computed(() => store.isLowCredits && !creditBannerDismissed.value);
const showEmptyStateLayout = computed(() => !props.threadId);

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

// Load persisted threads from Mastra storage on mount
onMounted(() => {
	enablePanelTransitionsAfterStableRender();
	void store.loadThreads().then((loaded) => {
		if (!loaded) return;
		if (!props.threadId) return;
		// After threads load, validate deep-link: redirect if thread doesn't exist
		if (!store.threads.some((t) => t.id === props.threadId)) {
			void router.replace({ name: INSTANCE_AI_VIEW });
		} else if (props.threadId !== store.currentThreadId) {
			// Thread exists on server — now safe to switch
			store.switchThread(props.threadId);
		}
	});
	void store.fetchCredits();
	store.startCreditsPushListener();
	void nextTick(() => chatInputRef.value?.focus());

	// Subscribe to push + fetch backend gateway state. The backend keeps the
	// pairing alive across reloads, so the client never contacts the daemon
	// on mount — only in response to explicit user action in the setup modal.
	void settingsStore
		.refreshModuleSettings()
		.catch(() => {})
		.then(async () => await settingsStore.ensurePreferencesLoaded())
		.catch(() => {})
		.then(() => {
			if (settingsStore.isLocalGatewayDisabled) return;
			settingsStore.startGatewayPushListener();
			void settingsStore.fetchGatewayStatus();
		});
});

// React to admin or user toggling local gateway
watch(
	() => settingsStore.isLocalGatewayDisabled,
	(disabled) => {
		if (disabled) {
			settingsStore.stopGatewayPushListener();
		} else {
			settingsStore.startGatewayPushListener();
			void settingsStore.fetchGatewayStatus();
		}
	},
);

// --- Sidebar collapse & resize ---
// Session-scoped: survives page refresh, resets when the user navigates away
// from the AI chat view (see onBeforeRouteLeave below).
const sidebarCollapsed = useSessionStorage('instanceAi.sidebarCollapsed', true);
const sidebarWidth = ref(260);
const { width: windowWidth } = useWindowSize();

// --- Side panels ---
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');
const hasPreviewTabs = computed(() => preview.allArtifactTabs.value.length > 0);
const isArtifactsPanelPinned = useSessionStorage('instanceAi.artifactsPanelPinned', true);
const isArtifactsPanelRevealed = ref(false);
const MIN_AVAILABLE_WIDTH_FOR_PINNED_ARTIFACTS_PANEL = 900;
const mainSidebarOccupiedWidth = computed(() =>
	isMainSidebarCollapsed.value ? COLLAPSED_MAIN_SIDEBAR_WIDTH : mainSidebarWidth.value,
);
const availableWidthForPinnedArtifactsPanel = computed(
	() =>
		windowWidth.value -
		mainSidebarOccupiedWidth.value -
		(sidebarCollapsed.value ? 0 : sidebarWidth.value),
);
const isArtifactsPanelPinningAvailable = computed(
	() =>
		availableWidthForPinnedArtifactsPanel.value >= MIN_AVAILABLE_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
);
const isArtifactsPanelEffectivelyPinned = computed(
	() => isArtifactsPanelPinningAvailable.value && isArtifactsPanelPinned.value,
);
const canShowArtifactsPanel = computed(
	() => store.hasMessages || (Boolean(props.threadId) && store.isHydratingThread),
);
const artifactsPanelTransitionGate = useTransitionGate({
	isBlocked: () => store.isHydratingThread,
});
const previewPanelTransitionGate = useTransitionGate({
	isBlocked: () => store.isHydratingThread,
});
const isArtifactsPanelTransitionEnabled = artifactsPanelTransitionGate.isEnabled;
const isPreviewPanelTransitionEnabled = previewPanelTransitionGate.isEnabled;
const artifactsPreviewToggleLabel = computed(() =>
	i18n.baseText(
		preview.isPreviewVisible.value
			? 'instanceAi.artifactsPanel.hidePreview'
			: 'instanceAi.artifactsPanel.showPreview',
	),
);
const artifactsPanelTransitionName = computed(() =>
	preview.isPreviewVisible.value ? 'artifacts-panel-preview' : 'artifacts-panel-fade',
);
const showArtifactsPanelEdge = computed(
	() =>
		canShowArtifactsPanel.value &&
		!preview.isPreviewVisible.value &&
		!isArtifactsPanelEffectivelyPinned.value,
);
const showArtifactsPanel = computed(
	() =>
		canShowArtifactsPanel.value &&
		!preview.isPreviewVisible.value &&
		(isArtifactsPanelEffectivelyPinned.value || isArtifactsPanelRevealed.value),
);

function toggleArtifactsPreview() {
	if (preview.isPreviewVisible.value) {
		preview.closePreview();
		return;
	}

	const firstTab = preview.allArtifactTabs.value[0];
	if (firstTab) {
		preview.selectTab(firstTab.id);
	}
}

function revealArtifactsPanel() {
	if (
		!canShowArtifactsPanel.value ||
		isArtifactsPanelEffectivelyPinned.value ||
		preview.isPreviewVisible.value
	) {
		return;
	}
	isArtifactsPanelRevealed.value = true;
}

function hideArtifactsPanel(event?: FocusEvent) {
	if (isArtifactsPanelEffectivelyPinned.value) return;
	if (
		event?.currentTarget instanceof HTMLElement &&
		event.relatedTarget instanceof Node &&
		event.currentTarget.contains(event.relatedTarget)
	) {
		return;
	}
	isArtifactsPanelRevealed.value = false;
}

function toggleArtifactsPanelPinned() {
	if (!isArtifactsPanelPinningAvailable.value) return;

	const nextPinned = !isArtifactsPanelPinned.value;
	isArtifactsPanelPinned.value = nextPinned;
	isArtifactsPanelRevealed.value = !nextPinned;
}

function enablePanelTransitionsAfterStableRender() {
	artifactsPanelTransitionGate.enableAfterStableRender();
	previewPanelTransitionGate.enableAfterStableRender();
}

function suppressPanelTransitionsUntilStableRender() {
	artifactsPanelTransitionGate.suppressUntilStableRender();
	previewPanelTransitionGate.suppressUntilStableRender();
}

watch(preview.isPreviewVisible, (visible) => {
	if (visible) {
		isArtifactsPanelRevealed.value = false;
	}
});

watch(isArtifactsPanelPinningAvailable, (isAvailable) => {
	if (!isAvailable) {
		isArtifactsPanelRevealed.value = false;
	}
});

watch(canShowArtifactsPanel, (canShow) => {
	if (!canShow) {
		isArtifactsPanelRevealed.value = false;
	}
});

watch(
	() => props.threadId,
	(threadId, previousThreadId) => {
		if (threadId !== previousThreadId) {
			suppressPanelTransitionsUntilStableRender();
		}
	},
);

watch(
	() => store.currentThreadId,
	() => {
		suppressPanelTransitionsUntilStableRender();
	},
);

watch(
	() => store.isHydratingThread,
	(isHydrating) => {
		if (isHydrating) {
			artifactsPanelTransitionGate.suppress();
			previewPanelTransitionGate.suppress();
			return;
		}
		suppressPanelTransitionsUntilStableRender();
	},
);

function toggleSidebarCollapse() {
	sidebarCollapsed.value = !sidebarCollapsed.value;
}

// Reset to collapsed when leaving the AI chat namespace, so the next entry
// starts collapsed by default. Refreshes (which don't trigger the guard) keep
// the user's current open/closed state.
const CHAT_ROUTE_NAMES = new Set<string>([INSTANCE_AI_VIEW, INSTANCE_AI_THREAD_VIEW]);
onBeforeRouteLeave((to) => {
	const name = typeof to.name === 'string' ? to.name : undefined;
	if (!name || !CHAT_ROUTE_NAMES.has(name)) {
		sidebarCollapsed.value = true;
	}
});

function handleSidebarResize({ width }: { width: number }) {
	// Drag below min-width threshold → auto-collapse
	if (width <= 200) {
		sidebarCollapsed.value = true;
		return;
	}
	sidebarWidth.value = width;
}

// --- Preview panel resize (when canvas is visible) ---
const previewPanelWidth = ref(Math.round((windowWidth.value - sidebarWidth.value) / 2));
const isResizingPreview = ref(false);
const isPreviewExpanded = ref(false);
const previewMaxWidth = computed(() => Math.round((windowWidth.value - sidebarWidth.value) / 2));
const previewPanelStyle = computed(() =>
	isPreviewExpanded.value ? undefined : { width: `${previewPanelWidth.value}px` },
);

function togglePreviewExpanded() {
	isPreviewExpanded.value = !isPreviewExpanded.value;
}

// Clamp preview width when the window shrinks
watch(previewMaxWidth, (max) => {
	if (previewPanelWidth.value > max) {
		previewPanelWidth.value = max;
	}
});

function handlePreviewResize({ width }: { width: number }) {
	previewPanelWidth.value = width;
}

// Re-compute default width when preview opens so it starts at 50%
watch(preview.isPreviewVisible, (visible) => {
	if (visible) {
		previewPanelWidth.value = Math.round((windowWidth.value - sidebarWidth.value) / 2);
	}
});

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

// Reset scroll state when switching threads so new content auto-scrolls
watch(
	() => store.currentThreadId,
	() => {
		userScrolledUp.value = false;
		void nextTick(() => {
			chatInputRef.value?.focus();
		});
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

// Focus input on initial render (ref rebinds when messages load and layout switches)
watch(chatInputRef, (el) => {
	if (el) {
		void nextTick(() => el.focus());
	}
});

// --- Floating input dynamic padding ---
const inputContainerRef = useTemplateRef<HTMLElement>('inputContainer');
const inputAreaHeight = ref(120);
let resizeObserver: ResizeObserver | null = null;

watch(
	inputContainerRef,
	(el) => {
		resizeObserver?.disconnect();
		if (el) {
			resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					inputAreaHeight.value = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
				}
			});
			resizeObserver.observe(el);
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	contentResizeObserver?.disconnect();
	resizeObserver?.disconnect();
	executionTracking.cleanup();
	store.closeSSE();
	store.stopCreditsPushListener();
	settingsStore.stopGatewayPushListener();
});

function reconnectThreadIfHydrationApplied(threadId: string): void {
	void store.loadHistoricalMessages(threadId).then((hydrationStatus) => {
		if (hydrationStatus === 'stale') return;
		void store.loadThreadStatus(threadId);
		store.connectSSE(threadId);
	});
}

watch(
	() => props.threadId,
	(threadId) => {
		if (!threadId) {
			// /instance-ai base route (no :threadId): always show the empty
			// state. Without this, `currentThreadId` keeps pointing at the last
			// thread and the sidebar highlights it alongside the empty main
			// view (AI-2408). A new thread is created on the first
			// `sendMessage` via `syncThread`.
			store.clearCurrentThread();
			return;
		}
		if (threadId === store.currentThreadId) {
			// Re-entering the same thread (e.g. after navigating away and back) —
			// SSE was closed on unmount, reconnect if needed.
			if (store.sseState === 'disconnected') {
				reconnectThreadIfHydrationApplied(threadId);
			}
			return;
		}

		// Clear execution tracking for previous thread
		executionTracking.clearAll();

		// Only switch to threads that exist in the sidebar (loaded from server).
		// Unknown thread IDs are validated after loadThreads completes (see onMounted).
		if (store.threads.some((t) => t.id === threadId)) {
			store.switchThread(threadId);
		}
	},
	{ immediate: true },
);

// --- Workflow preview ref for iframe relay ---
const workflowPreviewRef =
	useTemplateRef<InstanceType<typeof InstanceAiWorkflowPreview>>('workflowPreview');

const eventRelay = useEventRelay({
	workflowExecutions: executionTracking.workflowExecutions,
	activeWorkflowId: preview.activeWorkflowId,
	getBufferedEvents: executionTracking.getBufferedEvents,
	clearEventLog: executionTracking.clearEventLog,
	relay: (event) => workflowPreviewRef.value?.relayPushEvent(event),
});

// --- Message handlers ---
function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	// Reset scroll on new user message
	userScrolledUp.value = false;
	preview.markUserSentMessage();
	const shouldUpdateRoute = !props.threadId;
	const threadId = store.currentThreadId;
	void store.sendMessage(message, attachments, rootStore.pushRef).then(() => {
		// After the first message is sent, update the URL to include the thread ID
		// so the thread is addressable and appears in the sidebar.
		// Only update the route if the thread was persisted (syncThread succeeded).
		if (shouldUpdateRoute && store.threads.some((t) => t.id === threadId)) {
			void router.replace({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId },
			});
		}
	});
}

function handleStop() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-container">
		<!-- Resizable sidebar -->
		<Transition name="sidebar-slide">
			<N8nResizeWrapper
				v-if="!sidebarCollapsed"
				:class="$style.sidebar"
				:width="sidebarWidth"
				:style="{ width: `${sidebarWidth}px` }"
				:supported-directions="['right']"
				:is-resizing-enabled="true"
				:min-width="200"
				:max-width="400"
				@resize="handleSidebarResize"
			>
				<InstanceAiThreadList @collapse="toggleSidebarCollapse" />
			</N8nResizeWrapper>
		</Transition>

		<!-- Main chat area -->
		<div :class="$style.chatArea">
			<!-- Header -->
			<div :class="$style.header">
				<div :class="$style.headerIdentity">
					<Transition name="sidebar-toggle-fade">
						<span v-if="sidebarCollapsed" :class="$style.sidebarToggle">
							<N8nTooltip
								:content="i18n.baseText('instanceAi.sidebar.chatHistory')"
								placement="bottom"
								:show-after="TOOLTIP_DELAY_MS"
							>
								<N8nIconButton
									icon="history"
									variant="ghost"
									size="small"
									icon-size="large"
									data-test-id="instance-ai-sidebar-toggle"
									:aria-label="i18n.baseText('instanceAi.sidebar.chatHistory')"
									@click="toggleSidebarCollapse"
								/>
							</N8nTooltip>
						</span>
					</Transition>
					<N8nHeading v-if="currentThreadTitle" tag="h2" size="small" :class="$style.headerTitle">
						{{ currentThreadTitle }}
					</N8nHeading>
					<N8nText
						v-if="store.sseState === 'reconnecting'"
						size="small"
						color="text-light"
						:class="$style.reconnecting"
					>
						{{ i18n.baseText('instanceAi.view.reconnecting') }}
					</N8nText>
				</div>
				<div :class="$style.headerActions">
					<CreditsSettingsDropdown
						v-if="store.creditsRemaining !== undefined"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						:is-low-credits="store.isLowCredits"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
					/>
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
						:content="artifactsPreviewToggleLabel"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
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
					</N8nTooltip>
				</div>
			</div>

			<N8nCallout
				v-if="isReadOnlyEnvironment"
				theme="warning"
				icon="lock"
				:class="$style.readOnlyBanner"
			>
				{{ i18n.baseText('readOnlyEnv.instanceAi.notice') }}
			</N8nCallout>

			<!-- Content area: chat + artifacts side by side below header -->
			<div
				:class="[
					$style.contentArea,
					{
						[$style.contentAreaWithPinnedArtifacts]:
							showArtifactsPanel && isArtifactsPanelEffectivelyPinned,
					},
					{ [$style.contentAreaWithoutLayoutTransitions]: !isPreviewPanelTransitionEnabled },
				]"
				:data-layout-transitions-enabled="isPreviewPanelTransitionEnabled"
				data-test-id="instance-ai-content-area"
			>
				<div :class="$style.chatContent">
					<!-- Empty state: centered layout -->
					<div v-if="showEmptyStateLayout" :class="$style.emptyLayout">
						<InstanceAiEmptyState />
						<div :class="$style.centeredInput">
							<InstanceAiStatusBar />
							<CreditWarningBanner
								v-if="showCreditBanner"
								:credits-remaining="store.creditsRemaining"
								:credits-quota="store.creditsQuota"
								@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
								@dismiss="creditBannerDismissed = true"
							/>
							<InstanceAiInput
								ref="chatInputRef"
								:is-streaming="store.isStreaming"
								:suggestions="INSTANCE_AI_EMPTY_STATE_SUGGESTIONS"
								@submit="handleSubmit"
								@stop="handleStop"
							/>
						</div>
					</div>

					<!-- Messages: scroll + floating input layout -->
					<template v-else>
						<N8nScrollArea :class="$style.scrollArea">
							<div
								ref="scrollable"
								:class="$style.messageList"
								:style="{ paddingBottom: `calc(${inputAreaHeight}px + var(--spacing--sm))` }"
							>
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
								<InstanceAiConfirmationPanel />
							</div>
						</N8nScrollArea>

						<!-- Scroll to bottom button -->
						<div
							:class="$style.scrollButtonContainer"
							:style="{ bottom: `${inputAreaHeight + 8}px` }"
						>
							<Transition name="fade">
								<N8nIconButton
									v-if="userScrolledUp && store.hasMessages"
									variant="outline"
									icon="arrow-down"
									:class="$style.scrollToBottomButton"
									@click="
										scrollToBottom(true);
										userScrolledUp = false;
									"
								/>
							</Transition>
						</div>

						<!-- Floating input -->
						<div ref="inputContainer" :class="$style.inputContainer">
							<div :class="$style.inputConstraint">
								<InstanceAiStatusBar />
								<CreditWarningBanner
									v-if="showCreditBanner"
									:credits-remaining="store.creditsRemaining"
									:credits-quota="store.creditsQuota"
									@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
									@dismiss="creditBannerDismissed = true"
								/>
								<InstanceAiInput
									ref="chatInputRef"
									:is-streaming="store.isStreaming"
									@submit="handleSubmit"
									@stop="handleStop"
								/>
							</div>
						</div>
					</template>
				</div>

				<!-- Artifacts panel (below header, beside chat) -->
				<div
					v-if="showArtifactsPanelEdge"
					:class="$style.artifactsPanelEdge"
					role="button"
					tabindex="0"
					:aria-label="i18n.baseText('instanceAi.artifactsPanel.showPanel')"
					data-test-id="instance-ai-artifacts-sidebar-edge"
					@click="revealArtifactsPanel"
					@mouseenter="revealArtifactsPanel"
					@focusin="revealArtifactsPanel"
					@keydown.enter.prevent="revealArtifactsPanel"
					@keydown.space.prevent="revealArtifactsPanel"
				/>
				<Transition :name="artifactsPanelTransitionName" :css="isArtifactsPanelTransitionEnabled">
					<div
						v-if="showArtifactsPanel"
						:class="$style.artifactsPanelSlot"
						data-test-id="instance-ai-artifacts-sidebar-slot"
						@mouseenter="revealArtifactsPanel"
						@mouseleave="hideArtifactsPanel()"
						@focusin="revealArtifactsPanel"
						@focusout="hideArtifactsPanel"
					>
						<InstanceAiArtifactsPanel
							:is-pinned="isArtifactsPanelEffectivelyPinned"
							:is-pinning-available="isArtifactsPanelPinningAvailable"
							@toggle-pinned="toggleArtifactsPanelPinned"
						/>
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
			@after-leave="isPreviewExpanded = false"
		>
			<div
				v-show="preview.isPreviewVisible.value"
				:class="[$style.canvasArea, { [$style.canvasAreaExpanded]: isPreviewExpanded }]"
				:style="previewPanelStyle"
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
					:outset="true"
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
							@toggle-expanded="togglePreviewExpanded"
						/>
						<!-- Hoisted above the tab v-for so the iframe survives tab switches; tabs swap
						     workflows via openWorkflow postMessage instead of remounting. -->
						<div :class="$style.previewContent">
							<InstanceAiWorkflowPreview
								ref="workflowPreview"
								:class="[
									$style.previewSlot,
									{ [$style.previewSlotHidden]: !!preview.activeDataTableId.value },
								]"
								:workflow-id="preview.activeWorkflowId.value"
								:refresh-key="preview.workflowRefreshKey.value"
								@iframe-ready="eventRelay.handleIframeReady"
								@workflow-loaded="eventRelay.handleWorkflowLoaded"
							/>
							<InstanceAiDataTablePreview
								v-if="preview.activeDataTableId.value"
								:class="$style.previewSlot"
								:data-table-id="preview.activeDataTableId.value"
								:project-id="preview.activeDataTableProjectId.value"
								:refresh-key="preview.dataTableRefreshKey.value"
							/>
						</div>
					</TabsRoot>
				</N8nResizeWrapper>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
.container {
	--instance-ai-panel-transition-duration: calc(var(--duration--snappy) + 80ms);
	--instance-ai-panel-transition-easing: var(--easing--ease-in-out);

	display: flex;
	flex: 1 1 0;
	height: 100%;
	width: 100%;
	max-width: 100%;
	min-width: 900px;
	overflow: hidden;
	position: relative;
	z-index: 0;

	// Drop the stacking context while the workflow preview iframe NDV is
	// fullscreen so its `z-index` can escape and paint above the sidebar.
	&:has([data-test-id='workflow-preview-iframe'][data-ndv-open]) {
		z-index: auto;
	}
}

.sidebar {
	min-width: 200px;
	max-width: 400px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
}

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
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

	// Widen the resize handle hit area for easier grabbing
	:global([data-test-id='resize-handle']) {
		width: 12px !important;
		left: -6px !important;

		// Visible drag indicator line
		&::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 2px;
			height: 32px;
			border-radius: 1px;
			background: var(--color--foreground);
			opacity: 0;
			transition: opacity 0.15s ease;
		}

		&:hover::after {
			opacity: 1;
		}
	}
}

.canvasAreaExpanded {
	position: absolute;
	inset: 0;
	z-index: 4;
	border-left: none;
	background-color: var(--color--background--light-2);
}

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	flex-shrink: 0;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--spacing--2xs);
	background-color: var(--color--background--light-2);
	overflow: hidden;
}

.headerIdentity {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	contain: layout paint;
}

.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	color: var(--color--text);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.sidebarToggle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	flex: 0 0 var(--spacing--xl);
}

.activeButton {
	color: var(--color--primary);
}

.reconnecting {
	font-style: italic;
}

.contentArea {
	--instance-ai-artifacts-panel-width: 280px;

	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
}

.artifactsPanelEdge {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	z-index: 3;
	width: var(--spacing--xl);
	cursor: default;
	outline: none;

	&:focus-visible {
		box-shadow: inset calc(-1 * var(--spacing--5xs)) 0 0 var(--color--primary);
	}
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
}

.chatContent {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	position: relative;
}

.emptyLayout {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	padding-top: 20vh;
}

.centeredInput {
	width: 100%;
	max-width: 680px;
}

.scrollArea {
	flex: 1;
	// Allow flex item to shrink below content size so reka-ui viewport scrolls
	min-height: 0;
}

.messageList {
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--sm) var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	transition:
		max-width var(--instance-ai-panel-transition-duration)
			var(--instance-ai-panel-transition-easing),
		transform var(--instance-ai-panel-transition-duration)
			var(--instance-ai-panel-transition-easing);
}

.contentAreaWithPinnedArtifacts {
	.messageList {
		max-width: min(800px, calc(100% - var(--instance-ai-artifacts-panel-width)));
	}

	.messageList,
	.scrollButtonContainer {
		transform: translateX(calc(var(--instance-ai-artifacts-panel-width) / -2));
	}

	.inputConstraint {
		max-width: min(750px, calc(100% - var(--instance-ai-artifacts-panel-width)));
		transform: translateX(calc(var(--instance-ai-artifacts-panel-width) / -2));
	}
}

.contentAreaWithoutLayoutTransitions {
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

.scrollButtonContainer {
	position: absolute;
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	pointer-events: none;
	z-index: 3;
	transition: transform var(--instance-ai-panel-transition-duration)
		var(--instance-ai-panel-transition-easing);
}

.scrollToBottomButton {
	pointer-events: auto;
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.inputContainer {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
	pointer-events: none;
	z-index: 2;

	& > * {
		pointer-events: auto;
	}
}

.inputConstraint {
	max-width: 750px;
	margin: 0 auto;
	transition:
		max-width var(--instance-ai-panel-transition-duration)
			var(--instance-ai-panel-transition-easing),
		transform var(--instance-ai-panel-transition-duration)
			var(--instance-ai-panel-transition-easing);
}

@media (prefers-reduced-motion: reduce) {
	.messageList,
	.scrollButtonContainer,
	.inputConstraint {
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

.artifacts-panel-fade-enter-active,
.artifacts-panel-fade-leave-active {
	--artifacts-panel-fade-enter-easing: var(--easing--ease-out);
	--artifacts-panel-fade-exit-easing: var(--easing--ease-in);
	--animation--fade-in-right--easing: var(--artifacts-panel-fade-enter-easing);
	--animation--fade-in-right--translate: 100%;
	--animation--fade-out-right--easing: var(--artifacts-panel-fade-exit-easing);
	--animation--fade-out-right--translate: 100%;

	will-change: opacity, transform;

	@media (prefers-reduced-motion: reduce) {
		will-change: auto;
	}
}

.artifacts-panel-fade-enter-active {
	@include motion.fade-in-right;
}

.artifacts-panel-fade-leave-active {
	--animation--fade-out-right--duration: calc(var(--duration--snappy) - 40ms);

	@include motion.fade-out-right;
	pointer-events: none;
}

.artifacts-panel-preview-leave-active {
	--animation--fade-out--duration: calc(var(--duration--snappy) - 80ms);
	--animation--fade-out--easing: var(--easing--ease-out);

	@include motion.fade-out;
	pointer-events: none;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
	transition:
		width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
		min-width 0.2s cubic-bezier(0.16, 1, 0.3, 1),
		opacity 0.2s ease;
	overflow: hidden;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
	width: 0 !important;
	min-width: 0 !important;
	opacity: 0;
}

// Entry-point icon button: fade in slightly after the sidebar has begun
// collapsing, fade out quickly when the sidebar starts opening — so the
// crossover feels intentional rather than abrupt.
.sidebar-toggle-fade-enter-from,
.sidebar-toggle-fade-leave-to {
	opacity: 0;
}

.sidebar-toggle-fade-enter-active {
	transition: opacity 0.15s ease;
}

.sidebar-toggle-fade-leave-active {
	transition: opacity 0.1s ease;
}
</style>
