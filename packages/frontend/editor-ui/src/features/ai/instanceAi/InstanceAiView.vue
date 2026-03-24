<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
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
import InstanceAiSettingsPanel from './components/settings/InstanceAiSettingsPanel.vue';
import InstanceAiStatusBar from './components/InstanceAiStatusBar.vue';
import InstanceAiConfirmationPanel from './components/InstanceAiConfirmationPanel.vue';

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const i18n = useI18n();
const route = useRoute();
const documentTitle = useDocumentTitle();

documentTitle.set('Instance AI');

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
const showArtifactsPanel = ref(false);
const showMemoryPanel = ref(false);
const showDebugPanel = ref(false);
const showSettingsPanel = ref(false);

// --- Sidebar resize ---
const sidebarWidth = ref(260);
function handleSidebarResize({ width }: { width: number }) {
	sidebarWidth.value = width;
}

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
	await store.sendMessage(message, attachments);
}

function handleSuggestionSelect(prompt: string) {
	void handleSubmit(prompt);
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

		<!-- Main chat area -->
		<div :class="$style.chatArea">
			<!-- Header -->
			<div :class="$style.header">
				<N8nText tag="h2" size="large" bold>
					{{ i18n.baseText('instanceAi.view.title') }}
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
						icon="layers"
						variant="ghost"
						size="small"
						:class="{ [$style.activeButton]: showArtifactsPanel }"
						@click="showArtifactsPanel = !showArtifactsPanel"
					/>
					<N8nIconButton
						icon="cog"
						variant="ghost"
						size="small"
						:class="{ [$style.activeButton]: showSettingsPanel }"
						@click="showSettingsPanel = !showSettingsPanel"
					/>
					<N8nIconButton
						icon="brain"
						variant="ghost"
						size="small"
						:class="{ [$style.activeButton]: showMemoryPanel }"
						@click="showMemoryPanel = !showMemoryPanel"
					/>
					<N8nIconButton
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

			<!-- Messages -->
			<N8nScrollArea :class="$style.scrollArea">
				<div
					ref="scrollable"
					:class="$style.messageList"
					:style="{ paddingBottom: `${inputAreaHeight}px` }"
				>
					<InstanceAiEmptyState v-if="!store.hasMessages" @select="handleSuggestionSelect" />
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
			<div :class="$style.scrollButtonContainer" :style="{ bottom: `${inputAreaHeight + 8}px` }">
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
				<div :class="$style.inputInner">
					<InstanceAiStatusBar />
					<InstanceAiInput
						:is-streaming="store.isStreaming"
						@submit="handleSubmit"
						@stop="handleStop"
					/>
				</div>
			</div>

			<!-- Side panels -->
			<InstanceAiArtifactsPanel v-if="showArtifactsPanel" @close="showArtifactsPanel = false" />
			<InstanceAiSettingsPanel v-if="showSettingsPanel" @close="showSettingsPanel = false" />
			<InstanceAiMemoryPanel v-if="showMemoryPanel" @close="showMemoryPanel = false" />
			<InstanceAiDebugPanel
				v-if="showDebugPanel"
				@close="
					showDebugPanel = false;
					store.debugMode = false;
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
	background-color: var(--color--background--light-2);
}

.header {
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
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
}

.inputContainer {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
	pointer-events: none;
	z-index: 2;
}

.inputInner {
	max-width: calc(750px + 2 * var(--spacing--lg));
	margin: 0 auto;
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	pointer-events: auto;
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
