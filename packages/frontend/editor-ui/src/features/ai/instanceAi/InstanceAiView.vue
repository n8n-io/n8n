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
import { useRoute, useRouter } from 'vue-router';
import {
	N8nHeading,
	N8nIconButton,
	N8nResizeWrapper,
	N8nScrollArea,
	N8nText,
	N8nButton,
} from '@n8n/design-system';
import { useLocalStorage, useScroll, useWindowSize } from '@vueuse/core';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { useCanvasPreview } from './useCanvasPreview';
import { useEventRelay } from './useEventRelay';
import { useExecutionPushEvents } from './useExecutionPushEvents';
import {
	INSTANCE_AI_VIEW,
	INSTANCE_AI_SETTINGS_VIEW,
	INSTANCE_AI_THREAD_VIEW,
	NEW_CONVERSATION_TITLE,
} from './constants';
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
import { TabsContent, TabsRoot } from 'reka-ui';

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

function goToSettings() {
	void router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}

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
const currentThreadTitle = computed(() => {
	const thread = store.threads.find((t) => t.id === store.currentThreadId);
	if (!thread || thread.title === NEW_CONVERSATION_TITLE) {
		const firstUserMsg = store.messages.find((m) => m.role === 'user');
		if (firstUserMsg?.content) {
			const text = firstUserMsg.content.trim();
			return text.length > 60 ? text.slice(0, 60) + '\u2026' : text;
		}
		return NEW_CONVERSATION_TITLE;
	}
	return thread.title;
});

// --- Canvas / data table preview ---
const preview = useCanvasPreview({
	store,
	route,
	workflowExecutions: executionTracking.workflowExecutions,
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

// Load persisted threads from Mastra storage on mount
onMounted(() => {
	void store.loadThreads().then((loaded) => {
		if (!loaded || !props.threadId) return;
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

// --- Side panels ---
const showArtifactsPanel = ref(true);
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');

// --- Sidebar collapse & resize ---
const sidebarCollapsed = useLocalStorage('instanceAi.sidebarCollapsed', false);
const sidebarWidth = ref(260);

function toggleSidebarCollapse() {
	sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleSidebarResize({ width }: { width: number }) {
	// Drag below min-width threshold → auto-collapse
	if (width <= 200) {
		sidebarCollapsed.value = true;
		return;
	}
	sidebarWidth.value = width;
}

// --- Preview panel resize (when canvas is visible) ---
const { width: windowWidth } = useWindowSize();
const previewPanelWidth = ref(Math.round((windowWidth.value - sidebarWidth.value) / 2));
const isResizingPreview = ref(false);
const previewMaxWidth = computed(() => Math.round((windowWidth.value - sidebarWidth.value) / 2));

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

// --- Chat input ref for auto-focus ---
const chatInputRef = ref<InstanceType<typeof InstanceAiInput> | null>(null);

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
			// /instance-ai base route (no :threadId) — reset to a clean empty
			// state. Without this, `currentThreadId` keeps pointing at the
			// last thread and the sidebar highlights it alongside the empty
			// main view (AI-2408). A new thread is created on the first
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
			<InstanceAiThreadList />
		</N8nResizeWrapper>

		<!-- Main chat area -->
		<div :class="$style.chatArea">
			<!-- Header -->
			<div :class="$style.header">
				<N8nButton
					:icon="sidebarCollapsed ? 'list' : 'panel-left'"
					variant="ghost"
					size="medium"
					data-test-id="instance-ai-sidebar-toggle"
					:icon-only="!sidebarCollapsed"
					@click="toggleSidebarCollapse"
				>
					<template v-if="sidebarCollapsed">{{
						i18n.baseText('instanceAi.sidebar.threads')
					}}</template>
				</N8nButton>
				<N8nHeading tag="h2" size="small" :class="$style.headerTitle">
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
				<div :class="$style.headerActions">
					<CreditsSettingsDropdown
						v-if="store.creditsRemaining !== undefined"
						:credits-remaining="store.creditsRemaining"
						:credits-quota="store.creditsQuota"
						:is-low-credits="store.isLowCredits"
						@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
					/>
					<N8nIconButton
						icon="cog"
						variant="ghost"
						size="medium"
						:class="$style.settingsButton"
						data-test-id="instance-ai-settings-button"
						@click="goToSettings"
					/>
					<N8nIconButton
						v-if="isDebugEnabled"
						icon="bug"
						variant="ghost"
						size="medium"
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
						size="medium"
						@click="showArtifactsPanel = !showArtifactsPanel"
					/>
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
			<div :class="$style.contentArea">
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
				<TabsContent
					v-for="tab in preview.allArtifactTabs.value"
					:key="tab.id"
					:value="tab.id"
					:class="$style.previewContent"
				>
					<InstanceAiWorkflowPreview
						v-if="preview.activeWorkflowId.value"
						ref="workflowPreview"
						:workflow-id="preview.activeWorkflowId.value"
						:execution-id="preview.activeExecutionId.value"
						:refresh-key="preview.workflowRefreshKey.value"
						@iframe-ready="eventRelay.handleIframeReady"
					/>
					<InstanceAiDataTablePreview
						v-else-if="preview.activeDataTableId.value"
						:data-table-id="preview.activeDataTableId.value"
						:project-id="preview.activeDataTableProjectId.value"
						:refresh-key="preview.dataTableRefreshKey.value"
					/>
				</TabsContent>
			</TabsRoot>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	width: 100%;
	min-width: 900px;
	overflow: hidden;
	position: relative;
	z-index: 0;
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

.header {
	padding: var(--spacing--sm) var(--spacing--lg);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	background-color: var(--color--background--light-2);
}

.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	color: var(--color--text);
}

.headerActions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.settingsButton {
	padding: var(--spacing--xs);
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
