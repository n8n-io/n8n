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
} from '@n8n/design-system';
import { useElementSize, useScroll } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { provideThread, useInstanceAiStore } from './instanceAi.store';
import { useCanvasPreview } from './useCanvasPreview';
import { useEventRelay } from './useEventRelay';
import { useExecutionPushEvents } from './useExecutionPushEvents';
import { useCreditWarningBanner } from './composables/useCreditWarningBanner';
import { INSTANCE_AI_VIEW, NEW_CONVERSATION_TITLE } from './constants';
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
const thread = provideThread(store);
const { isLowCredits } = storeToRefs(store);
const rootStore = useRootStore();
const i18n = useI18n();
const router = useRouter();
const { goToUpgrade } = usePageRedirectionHelper();
const creditBanner = useCreditWarningBanner(isLowCredits);

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
	const threadSummary = store.threads.find((t) => t.id === store.currentThreadId);
	if (threadSummary && threadSummary.title && threadSummary.title !== NEW_CONVERSATION_TITLE) {
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
const showArtifactsPanel = ref(true);
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');

// --- Preview panel resize (when canvas is visible) ---
// Cap the preview at 50% of the *available* thread area, not the full window —
// with the layout sidebar open the chat side would otherwise get less than 50%.
const threadAreaRef = useTemplateRef<HTMLElement>('threadArea');
const { width: threadAreaWidth } = useElementSize(threadAreaRef);
const previewPanelWidth = ref(0);
const isResizingPreview = ref(false);
const previewMaxWidth = computed(() => Math.round(threadAreaWidth.value / 2));

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

// Re-compute default width when preview opens so it starts at 50% of the
// currently-available thread area.
watch(preview.isPreviewVisible, (visible) => {
	if (visible) {
		previewPanelWidth.value = Math.round(threadAreaWidth.value / 2);
	}
});

// Late-initialize if the panel became visible before the ResizeObserver
// reported the container size (otherwise the panel would render at 0px).
watch(threadAreaWidth, (width) => {
	if (width > 0 && previewPanelWidth.value === 0 && preview.isPreviewVisible.value) {
		previewPanelWidth.value = Math.round(width / 2);
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

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

// Focus input on initial render (ref rebinds when messages load)
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

function reconnectThreadIfHydrationApplied(threadId: string): void {
	void thread.loadHistoricalMessages(threadId).then((hydrationStatus) => {
		if (hydrationStatus === 'stale') return;
		void thread.loadThreadStatus(threadId);
		thread.connectSSE(threadId);
	});
}

// Sync the route's :threadId into the store. Three cases:
// 1. We're already on this thread (e.g. arriving from EmptyView after the
//    first sendMessage updated the URL): keep the in-flight stream and only
//    reconnect SSE if it was torn down between mounts.
// 2. We know this thread (loaded in sidebar): switch.
// 3. We don't know it yet — wait for loadThreads to populate, then validate.
async function syncRouteToStore() {
	const requestedThreadId = props.threadId;
	if (requestedThreadId === store.currentThreadId) {
		if (thread.sseState === 'disconnected') {
			reconnectThreadIfHydrationApplied(requestedThreadId);
		}
		return;
	}

	// Different thread — clear execution tracking from previous one.
	executionTracking.clearAll();

	if (store.threads.some((t) => t.id === requestedThreadId)) {
		store.switchThread(requestedThreadId);
		return;
	}

	// Threads not loaded yet (or this id is unknown) — wait for the parent
	// layout's loadThreads to complete, then re-validate.
	if (!store.threads.length) {
		await store.loadThreads();
	}
	// User may have navigated elsewhere while we awaited
	if (requestedThreadId !== props.threadId) return;
	if (!store.threads.some((t) => t.id === requestedThreadId)) {
		void router.replace({ name: INSTANCE_AI_VIEW });
		return;
	}
	store.switchThread(requestedThreadId);
}

watch(
	() => props.threadId,
	() => void syncRouteToStore(),
	{ immediate: true },
);

onMounted(() => {
	void nextTick(() => chatInputRef.value?.focus());
});

onUnmounted(() => {
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
					<N8nIconButton
						v-if="!preview.isPreviewVisible.value"
						icon="panel-right"
						variant="ghost"
						size="small"
						icon-size="large"
						@click="showArtifactsPanel = !showArtifactsPanel"
					/>
				</template>
			</InstanceAiViewHeader>

			<!-- Content area: chat + artifacts side by side below header -->
			<div :class="$style.contentArea">
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
								:is-sending-message="thread.isSendingMessage"
								:is-awaiting-confirmation="thread.isAwaitingConfirmation"
								:current-thread-id="thread.currentThreadId"
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
				<InstanceAiArtifactsPanel v-if="showArtifactsPanel && !preview.isPreviewVisible.value" />

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
		<N8nResizeWrapper
			v-show="preview.isPreviewVisible.value"
			:class="$style.canvasArea"
			:width="previewPanelWidth"
			:style="{ width: `${previewPanelWidth}px` }"
			:min-width="400"
			:max-width="previewMaxWidth"
			:supported-directions="['left']"
			:is-resizing-enabled="true"
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
					@close="preview.closePreview()"
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
</template>

<style lang="scss" module>
.threadArea {
	flex: 1;
	display: flex;
	min-width: 0;
	overflow: hidden;
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
	display: flex;
	flex: 1;
	min-height: 0;
	position: relative;
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
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--sm) var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
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
</style>
