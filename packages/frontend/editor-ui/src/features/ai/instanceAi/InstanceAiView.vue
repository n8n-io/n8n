<script lang="ts" setup>
import { computed, onMounted, onUnmounted, provide, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { N8nIconButton, N8nResizeWrapper, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useScroll } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { NEW_CONVERSATION_TITLE } from './constants';
import InstanceAiMessage from './components/InstanceAiMessage.vue';
import InstanceAiInput from './components/InstanceAiInput.vue';
import InstanceAiEmptyState from './components/InstanceAiEmptyState.vue';
import InstanceAiThreadList from './components/InstanceAiThreadList.vue';
import InstanceAiMemoryPanel from './components/InstanceAiMemoryPanel.vue';
import InstanceAiDebugPanel from './components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from './components/InstanceAiArtifactsPanel.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './components/InstanceAiConfirmationPanel.vue';
import InstanceAiWorkflowPreview from './components/InstanceAiWorkflowPreview.vue';
import InstanceAiDataTablePreview from './components/InstanceAiDataTablePreview.vue';
import {
	getLatestBuildResult,
	getLatestExecutionId,
	getLatestDataTableResult,
	getLatestDeletedDataTableId,
} from './canvasPreview.utils';

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const i18n = useI18n();
const route = useRoute();
const documentTitle = useDocumentTitle();

documentTitle.set('n8n Uberagent');

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

provide('openWorkflowPreview', (workflowId: string) => {
	activeDataTableId.value = null;
	activeDataTableProjectId.value = null;
	activeWorkflowId.value = workflowId;
});

provide('openDataTablePreview', (dataTableId: string, projectId: string) => {
	activeWorkflowId.value = null;
	activeExecutionId.value = null;
	activeDataTableId.value = dataTableId;
	activeDataTableProjectId.value = projectId;
});

// Preserve canvas intent when switching threads
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

		if (
			!isPreviewVisible.value &&
			!store.isStreaming &&
			!userSentMessage.value &&
			!wasCanvasOpenBeforeSwitch.value
		) {
			return;
		}

		wasCanvasOpenBeforeSwitch.value = false;
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
	if (!isPreviewVisible.value && !store.isStreaming && !userSentMessage.value) return;

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

		if (
			!isPreviewVisible.value &&
			!store.isStreaming &&
			!userSentMessage.value &&
			!wasCanvasOpenBeforeSwitch.value
		) {
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

// Load persisted threads from Mastra storage on mount
onMounted(() => {
	void store.loadThreads();

	// Auto-connect local gateway if enabled
	void settingsStore
		.refreshModuleSettings()
		.catch(() => {})
		.then(() => {
			if (!settingsStore.isLocalGatewayDisabled) {
				settingsStore.startDaemonProbing();
				settingsStore.startGatewayPushListener();
				settingsStore.pollGatewayStatus();
			}
		});
});

// React to local gateway being toggled in settings without requiring a page reload
watch(
	() => settingsStore.isLocalGatewayDisabled,
	(disabled) => {
		if (disabled) {
			settingsStore.stopDaemonProbing();
			settingsStore.stopGatewayPolling();
			settingsStore.stopGatewayPushListener();
		} else {
			settingsStore.startDaemonProbing();
			settingsStore.startGatewayPushListener();
			settingsStore.pollGatewayStatus();
		}
	},
);

// --- Side panels ---
const showArtifactsPanel = ref(true);
const showMemoryPanel = ref(false);
const showDebugPanel = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');

// --- Sidebar resize ---
const sidebarWidth = ref(260);
function handleSidebarResize({ width }: { width: number }) {
	sidebarWidth.value = width;
}

// --- Chat area resize (when canvas is visible) ---
const chatAreaWidth = ref(400);
const isResizingChat = ref(false);
function handleChatAreaResize({ width }: { width: number }) {
	chatAreaWidth.value = width;
}

const chatAreaStyle = computed(() =>
	isPreviewVisible.value ? { width: `${chatAreaWidth.value}px`, flex: 'none' } : {},
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

// Reset scroll state when switching threads so new content auto-scrolls
watch(
	() => store.currentThreadId,
	() => {
		userScrolledUp.value = false;
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
	store.closeSSE();
	settingsStore.stopDaemonProbing();
	settingsStore.stopGatewayPolling();
	settingsStore.stopGatewayPushListener();
});

// --- Route-thread synchronization ---
const routeThreadId = computed(() =>
	typeof route.params.threadId === 'string' ? route.params.threadId : null,
);

watch(
	routeThreadId,
	(threadId) => {
		if (!threadId) {
			// /instance-ai base route (no :threadId) — bootstrap default thread + SSE
			if ((store.threads?.length ?? 0) === 0) {
				store.threads.push({
					id: store.currentThreadId,
					title: NEW_CONVERSATION_TITLE,
					createdAt: new Date().toISOString(),
				});
			}
			if (store.sseState === 'disconnected') {
				void store.loadHistoricalMessages(store.currentThreadId).then(() => {
					void store.loadThreadStatus(store.currentThreadId);
					store.connectSSE();
				});
			}
			return;
		}
		if (threadId === store.currentThreadId) {
			// Re-entering the same thread (e.g. after navigating away and back) —
			// SSE was closed on unmount, reconnect if needed.
			if (store.sseState === 'disconnected') {
				void store.loadHistoricalMessages(threadId).then(() => {
					void store.loadThreadStatus(threadId);
					store.connectSSE();
				});
			}
			return;
		}

		// Deep-link hydration: ensure thread exists in sidebar
		if (!store.threads.some((t) => t.id === threadId)) {
			store.threads.push({
				id: threadId,
				title: NEW_CONVERSATION_TITLE,
				createdAt: new Date().toISOString(),
			});
		}
		// switchThread already calls loadHistoricalMessages internally
		store.switchThread(threadId);
	},
	{ immediate: true },
);

// --- Message handlers ---
async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	// Reset scroll on new user message
	userScrolledUp.value = false;
	userSentMessage.value = true;
	await store.sendMessage(message, attachments, iframePushRef.value ?? undefined);
}

function handleStop() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-container">
		<!-- Resizable sidebar -->
		<N8nResizeWrapper
			:class="$style.sidebar"
			:width="sidebarWidth"
			:style="{ width: `${sidebarWidth}px` }"
			:supported-directions="['right']"
			:is-resizing-enabled="true"
			@resize="handleSidebarResize"
		>
			<InstanceAiThreadList />
		</N8nResizeWrapper>

		<!-- Main chat area (resizable when canvas is visible) -->
		<component
			:is="isPreviewVisible ? N8nResizeWrapper : 'div'"
			:class="$style.chatArea"
			:style="chatAreaStyle"
			v-bind="
				isPreviewVisible
					? {
							width: chatAreaWidth,
							minWidth: 300,
							maxWidth: 700,
							supportedDirections: ['right'],
							isResizingEnabled: true,
							gridSize: 8,
							outset: true,
						}
					: {}
			"
			@resize="handleChatAreaResize"
			@resizestart="isResizingChat = true"
			@resizeend="isResizingChat = false"
		>
			<!-- Header -->
			<div :class="$style.header">
				<N8nText tag="h2" size="large" bold :class="$style.headerTitle">
					{{ currentThreadTitle }}
				</N8nText>
				<N8nText
					v-if="store.sseState === 'reconnecting'"
					size="small"
					color="text-light"
					:class="$style.reconnecting"
				>
					{{ i18n.baseText('instanceAi.view.reconnecting') }}
				</N8nText>
				<div :class="$style.headerActions">
					<N8nIconButton
						icon="brain"
						variant="ghost"
						size="small"
						:class="{ [$style.activeButton]: showMemoryPanel }"
						@click="showMemoryPanel = !showMemoryPanel"
					/>
					<N8nIconButton
						v-if="!isPreviewVisible"
						icon="panel-right"
						variant="ghost"
						size="small"
						:class="{ [$style.activeButton]: showArtifactsPanel }"
						@click="showArtifactsPanel = !showArtifactsPanel"
					/>
					<N8nIconButton
						v-if="isDebugEnabled"
						icon="bug"
						variant="ghost"
						size="small"
						:class="{ [$style.activeButton]: showDebugPanel }"
						@click="
							showDebugPanel = !showDebugPanel;
							store.debugMode = showDebugPanel;
						"
					/>
				</div>
			</div>

			<!-- Content area: chat + artifacts side by side below header -->
			<div :class="$style.contentArea">
				<div :class="$style.chatContent">
					<!-- Empty state: centered layout -->
					<div v-if="!store.hasMessages" :class="$style.emptyLayout">
						<InstanceAiEmptyState />
						<div :class="$style.centeredInput">
							<InstanceAiStatusBar />
							<InstanceAiInput
								:is-streaming="store.isStreaming"
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
								:style="{ paddingBottom: `${inputAreaHeight}px` }"
							>
								<TransitionGroup name="message-slide">
									<InstanceAiMessage
										v-for="message in store.messages"
										:key="message.id"
										:message="message"
									/>
								</TransitionGroup>
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
							<InstanceAiStatusBar />
							<InstanceAiInput
								:is-streaming="store.isStreaming"
								@submit="handleSubmit"
								@stop="handleStop"
							/>
						</div>
					</template>
				</div>

				<!-- Artifacts panel (below header, beside chat) -->
				<InstanceAiArtifactsPanel v-if="showArtifactsPanel && !isPreviewVisible" />

				<!-- Overlay panels -->
				<InstanceAiMemoryPanel v-if="showMemoryPanel" @close="showMemoryPanel = false" />
				<InstanceAiDebugPanel
					v-if="showDebugPanel"
					@close="
						showDebugPanel = false;
						store.debugMode = false;
					"
				/>
			</div>
		</component>

		<!-- Preview panel (workflow OR datatable) -->
		<div
			v-show="isPreviewVisible"
			:class="$style.canvasArea"
			:style="isResizingChat ? { pointerEvents: 'none' } : {}"
		>
			<InstanceAiWorkflowPreview
				v-if="activeWorkflowId"
				:workflow-id="activeWorkflowId"
				:execution-id="activeExecutionId"
				:refresh-key="workflowRefreshKey"
				@close="activeWorkflowId = null"
				@push-ref-ready="iframePushRef = $event"
			/>
			<InstanceAiDataTablePreview
				v-else-if="activeDataTableId"
				:data-table-id="activeDataTableId"
				:project-id="activeDataTableProjectId"
				:refresh-key="dataTableRefreshKey"
				@close="
					activeDataTableId = null;
					activeDataTableProjectId = null;
				"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	height: 100%;
	width: 100%;
	min-width: 900px;
	overflow: hidden;
}

.sidebar {
	min-width: 200px;
	max-width: 400px;
	flex-shrink: 0;
}

.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-1);

	// Widen the resize handle hit area for easier grabbing
	:global([data-test-id='resize-handle']) {
		width: 12px !important;
		right: -6px !important;

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

.canvasArea {
	flex: 1;
	min-width: 0;
	border-left: var(--border);
}

.header {
	padding: var(--spacing--sm) var(--spacing--lg);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
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
	justify-content: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
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
	background: linear-gradient(transparent 0%, var(--color--background--light-1) 30%);
	pointer-events: none;
	z-index: 2;

	& > * {
		pointer-events: auto;
	}
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
