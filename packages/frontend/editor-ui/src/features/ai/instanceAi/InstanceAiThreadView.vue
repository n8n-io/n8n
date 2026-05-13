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
import { useElementSize, useScroll, useSessionStorage, useWindowSize } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { COLLAPSED_MAIN_SIDEBAR_WIDTH, useSidebarLayout } from '@/app/composables/useSidebarLayout';
import { provideThread, useInstanceAiStore } from './instanceAi.store';
import { useCanvasPreview } from './useCanvasPreview';
import { useEventRelay } from './useEventRelay';
import { useExecutionPushEvents } from './useExecutionPushEvents';
import { useCreditWarningBanner } from './composables/useCreditWarningBanner';
import { useTransitionGate } from './useTransitionGate';
import { INSTANCE_AI_VIEW, NEW_CONVERSATION_TITLE } from './constants';
import { useSidebarState } from './instanceAiLayout';
import InstanceAiMessage from './components/InstanceAiMessage.vue';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiDebugPanel from './components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from './components/InstanceAiArtifactsPanel.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './components/InstanceAiConfirmationPanel.vue';
import InstanceAiPreviewTabBar from './components/InstanceAiPreviewTabBar.vue';
import InstanceAiViewHeader from './components/InstanceAiViewHeader.vue';
import AgentSection from './components/AgentSection.vue';
import { collectActiveBuilderAgents, messageHasVisibleContent } from './builderAgents';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import InstanceAiWorkflowPreview from './components/InstanceAiWorkflowPreview.vue';
import InstanceAiDataTablePreview from './components/InstanceAiDataTablePreview.vue';
import { TabsRoot } from 'reka-ui';

const props = defineProps<{
	threadId: string;
}>();

const store = useInstanceAiStore();
const thread = provideThread(props.threadId);
const { isLowCredits } = storeToRefs(store);
const rootStore = useRootStore();
const i18n = useI18n();
const router = useRouter();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(isLowCredits);
const sidebar = useSidebarState();
const { width: windowWidth } = useWindowSize();
const { isCollapsed: isMainSidebarCollapsed, sidebarWidth: mainSidebarWidth } = useSidebarLayout();

// Running builders render in a dedicated bottom section of the conversation.
// Once a builder finishes it falls out of this list and AgentTimeline renders
// it in its natural chronological slot.
const builderAgents = computed(() => collectActiveBuilderAgents(thread.messages));

// Assistant messages whose only content has been extracted to the bottom
// builder section (or which haven't produced anything renderable yet) would
// otherwise leave an empty wrapper in the list — filter them out.
const displayedMessages = computed(() => thread.messages.filter(messageHasVisibleContent));

// --- Execution tracking via push events ---
const executionTracking = useExecutionPushEvents();

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

// --- Canvas / data table preview ---
const preview = useCanvasPreview({
	thread,
	threadId: () => props.threadId,
});

provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);

// --- Side panels ---
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');
const hasPreviewTabs = computed(() => preview.allArtifactTabs.value.length > 0);
const isArtifactsPanelPinned = useSessionStorage('instanceAi.artifactsPanelPinned', true);
const isArtifactsPanelRevealed = ref(false);
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
const artifactsPanelTransitionName = computed(() =>
	isPreviewPanelTransitioning.value ? 'artifacts-panel-preview' : 'artifacts-panel-fade',
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

// --- Preview panel resize (when canvas is visible) ---
// Cap the preview at 50% of the available thread area so the chat retains at
// least the other half when side panels or app layout chrome are visible.
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
const isArtifactsPanelPinningAvailable = computed(
	() =>
		availableWidthForPinnedArtifactsPanel.value >= MIN_AVAILABLE_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
);
const isArtifactsPanelEffectivelyPinned = computed(
	() => isArtifactsPanelPinningAvailable.value && isArtifactsPanelPinned.value,
);
const canShowArtifactsPanel = computed(
	() => thread.hasMessages || (Boolean(props.threadId) && thread.isHydratingThread),
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
const reserveArtifactsPanelLayout = computed(
	() => showArtifactsPanel.value && isArtifactsPanelEffectivelyPinned.value,
);
const shouldSuppressContentLayoutTransitions = computed(
	() => !isPreviewPanelTransitionEnabled.value,
);
const previewPanelWidth = ref(0);
const isResizingPreview = ref(false);
const isPreviewExpanded = ref(false);
const previewMaxWidth = computed(() => Math.round(threadAreaWidth.value / 2));
const previewPanelStyle = computed(() =>
	isPreviewExpanded.value ? undefined : { width: `${previewPanelWidth.value}px` },
);

function togglePreviewExpanded() {
	isPreviewExpanded.value = !isPreviewExpanded.value;
}

// Clamp preview width when the available area shrinks (sidebar open, window
// resize, etc.)
watch(previewMaxWidth, (max) => {
	if (previewPanelWidth.value > max) {
		previewPanelWidth.value = max;
	}
});

function handlePreviewResize({ width }: { width: number }) {
	previewPanelWidth.value = width;
}

function handlePreviewPanelAfterEnter() {
	isPreviewPanelTransitioning.value = false;
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
			previewPanelWidth.value = Math.round(threadAreaWidth.value / 2);
		}
	},
	{ flush: 'sync' },
);

// Late-initialize if the panel became visible before the ResizeObserver
// reported the container size (otherwise the panel would render at 0px).
watch(threadAreaWidth, (width) => {
	if (width > 0 && previewPanelWidth.value === 0 && preview.isPreviewVisible.value) {
		previewPanelWidth.value = Math.round(width / 2);
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

// Focus input on initial render (ref rebinds when messages load)
watch(chatInputRef, (el) => {
	if (el) {
		void nextTick(() => el.focus());
	}
});

// Reset scroll state when switching threads so new content auto-scrolls.
watch(
	() => props.threadId,
	(threadId, previousThreadId) => {
		if (threadId !== previousThreadId) {
			userScrolledUp.value = false;
			void nextTick(() => {
				chatInputRef.value?.focus();
			});
		}
	},
);

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

function reconnectThreadAfterHydration(): void {
	void thread.loadHistoricalMessages().then((hydrationStatus) => {
		if (hydrationStatus === 'stale') return;
		void thread.loadThreadStatus();
		thread.connectSSE();
	});
}

// Validate the route's :threadId against the loaded thread list, then connect
// this route-scoped runtime. Route changes remount this component, so no
// store-level "active thread" state is needed here.
async function syncRouteToStore() {
	const requestedThreadId = props.threadId;
	if (!store.threads.length) {
		await store.loadThreads();
	}
	// User may have navigated elsewhere while we awaited
	if (requestedThreadId !== props.threadId) return;
	if (!store.threads.some((t) => t.id === requestedThreadId)) {
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
	void nextTick(() => chatInputRef.value?.focus());
});

onUnmounted(() => {
	thread.closeSSE();
	contentResizeObserver?.disconnect();
	resizeObserver?.disconnect();
	executionTracking.cleanup();
});

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
	void thread.sendMessage(message, attachments, rootStore.pushRef);
}

function handleStop() {
	void thread.cancelRun();
}
</script>

<template>
	<div ref="threadArea" :class="$style.threadArea">
		<!-- Main chat area -->
		<div :class="$style.chatArea">
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
								v-if="userScrolledUp && thread.hasMessages"
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
								v-if="creditBanner.visible.value"
								:credits-remaining="store.creditsRemaining"
								:credits-quota="store.creditsQuota"
								@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
								@dismiss="creditBanner.dismiss()"
							/>
							<InstanceAiInput
								ref="chatInputRef"
								:is-streaming="thread.isStreaming"
								:is-submitting="thread.isSendingMessage"
								:is-awaiting-confirmation="thread.isAwaitingConfirmation"
								:current-thread-id="thread.id"
								:amend-context="thread.amendContext"
								:contextual-suggestion="thread.contextualSuggestion"
								:research-mode="store.researchMode"
								@submit="handleSubmit"
								@stop="handleStop"
								@toggle-research-mode="store.toggleResearchMode()"
							/>
						</div>
					</div>
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
			@after-enter="handlePreviewPanelAfterEnter"
			@after-leave="handlePreviewPanelAfterLeave"
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
							:preview-toggle-label="artifactsPreviewToggleLabel"
							@toggle-preview="toggleArtifactsPreview"
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
	position: relative;
	z-index: 0;

	// Drop the stacking context while the workflow preview iframe NDV is
	// fullscreen so its `z-index` can escape and paint above the sidebar.
	&:has([data-test-id='workflow-preview-iframe'][data-ndv-open]) {
		z-index: auto;
	}
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

.scrollArea {
	flex: 1;
	// Allow flex item to shrink below content size so reka-ui viewport scrolls
	min-height: 0;
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

.scrollButtonContainer {
	position: absolute;
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	pointer-events: none;
	z-index: 3;
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
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
	width: calc(100% - var(--instance-ai-artifacts-layout-width));
	max-width: 750px;
	margin: 0 auto;
	transform: translateX(calc(var(--instance-ai-artifacts-layout-width) / -2));
}

@media (prefers-reduced-motion: reduce) {
	.contentArea,
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
