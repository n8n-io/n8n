<script lang="ts" setup>
import {
	computed,
	onMounted,
	onUnmounted,
	provide,
	reactive,
	ref,
	useTemplateRef,
	watch,
	watchEffect,
} from 'vue';
import { useRoute } from 'vue-router';
import {
	N8nButton,
	N8nHeading,
	N8nIconButton,
	N8nResizeWrapper,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useScroll, useWindowSize } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { useCanvasPreview } from './useCanvasPreview';
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
import InstanceAiDiscoverWalkthrough from './components/InstanceAiDiscoverWalkthrough.vue';
import type { InstanceAiDiscoverHighlightTargets } from './components/instanceAiDiscoverWalkthrough.types';

type InstanceAiInputExposed = {
	getChatInputHighlightEl?: () => HTMLElement | null;
	getResearchToggleEl?: () => HTMLElement | null;
};

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const i18n = useI18n();
const route = useRoute();
const documentTitle = useDocumentTitle();

documentTitle.set('n8n Agent');

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
const preview = useCanvasPreview({ store, route });

provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);

// Load persisted threads from Mastra storage on mount
onMounted(() => {
	try {
		showInstanceAiOnboardingButton.value =
			localStorage.getItem(INSTANCE_AI_ONBOARDING_ENABLED_KEY) === 'true';
	} catch {
		showInstanceAiOnboardingButton.value = false;
	}

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
const showDiscoverWalkthrough = ref(false);
const INSTANCE_AI_ONBOARDING_ENABLED_KEY = 'instance-ai-onboarding-enabled';
const showInstanceAiOnboardingButton = ref(false);
const isDebugEnabled = computed(() => localStorage.getItem('instanceAi.debugMode') === 'true');

/** Onboarding-related element refs for focusing */
const sidebarHighlightRef = ref<HTMLElement | null>(null);
const instanceAiInputEmptyRef = ref<InstanceAiInputExposed | null>(null);
const instanceAiInputFloatingRef = ref<InstanceAiInputExposed | null>(null);
const memoryButtonRef = ref<unknown>(null);

const discoverHighlightTargets = reactive<InstanceAiDiscoverHighlightTargets>({
	sidebar: null,
	chatInput: null,
	researchToggle: null,
	memoryButton: null,
});

function unwrapComponentRoot(target: unknown): HTMLElement | null {
	if (!target || typeof target !== 'object') return null;
	if ('$el' in target) {
		const el = (target as { $el: unknown }).$el;
		return el instanceof HTMLElement ? el : null;
	}
	return null;
}

watchEffect(() => {
	discoverHighlightTargets.sidebar = sidebarHighlightRef.value;
	discoverHighlightTargets.memoryButton = unwrapComponentRoot(memoryButtonRef.value);
	const inputInst = store.hasMessages
		? instanceAiInputFloatingRef.value
		: instanceAiInputEmptyRef.value;
	discoverHighlightTargets.chatInput = inputInst?.getChatInputHighlightEl?.() ?? null;
	discoverHighlightTargets.researchToggle = inputInst?.getResearchToggleEl?.() ?? null;
});

// --- Sidebar resize ---
const sidebarWidth = ref(260);
function handleSidebarResize({ width }: { width: number }) {
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
	preview.markUserSentMessage();
	await store.sendMessage(message, attachments, preview.iframePushRef.value ?? undefined);
}

function handleStop() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-ai-container">
		<!-- Resizable sidebar -->
		<div
			ref="sidebarHighlightRef"
			:class="[$style.sidebarColumn, $style.sidebar]"
			:style="{ width: `${sidebarWidth}px` }"
		>
			<N8nResizeWrapper
				:class="$style.sidebarResizeInner"
				:width="sidebarWidth"
				:style="{ width: '100%', height: '100%' }"
				:supported-directions="['right']"
				:is-resizing-enabled="true"
				@resize="handleSidebarResize"
			>
				<InstanceAiThreadList />
			</N8nResizeWrapper>
		</div>

		<!-- Main chat area -->
		<div :class="$style.chatArea">
			<!-- Header -->
			<div :class="$style.header">
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
					<N8nIconButton
						ref="memoryButtonRef"
						icon="brain"
						variant="ghost"
						size="medium"
						:class="{ [$style.activeButton]: showMemoryPanel }"
						@click="showMemoryPanel = !showMemoryPanel"
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

					<!-- Onboarding button (gated by localStorage `instance-ai-onboarding-enabled` === "true") -->
					<N8nTooltip v-if="showInstanceAiOnboardingButton" placement="bottom">
						<template #content>
							{{ i18n.baseText('instanceAi.discover.button.tooltip') }}
						</template>
						<template #default>
							<N8nButton
								variant="outline"
								size="small"
								:class="$style.discoverButton"
								data-test-id="instance-ai-discover-trigger"
								@click="showDiscoverWalkthrough = true"
							>
								{{ i18n.baseText('instanceAi.discover.button') }}
							</N8nButton>
						</template>
					</N8nTooltip>
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
								ref="instanceAiInputEmptyRef"
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
							<div :class="$style.inputConstraint">
								<InstanceAiStatusBar />
								<InstanceAiInput
									ref="instanceAiInputFloatingRef"
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
			<InstanceAiWorkflowPreview
				v-if="preview.activeWorkflowId.value"
				:workflow-id="preview.activeWorkflowId.value"
				:execution-id="preview.activeExecutionId.value"
				:refresh-key="preview.workflowRefreshKey.value"
				@close="preview.activeWorkflowId.value = null"
				@push-ref-ready="preview.iframePushRef.value = $event"
			/>
			<InstanceAiDataTablePreview
				v-else-if="preview.activeDataTableId.value"
				:data-table-id="preview.activeDataTableId.value"
				:project-id="preview.activeDataTableProjectId.value"
				:refresh-key="preview.dataTableRefreshKey.value"
				@close="
					preview.activeDataTableId.value = null;
					preview.activeDataTableProjectId.value = null;
				"
			/>
		</N8nResizeWrapper>

		<InstanceAiDiscoverWalkthrough
			v-model="showDiscoverWalkthrough"
			:highlight-targets="discoverHighlightTargets"
		/>
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

.sidebarColumn {
	display: flex;
	flex-direction: column;
	align-self: stretch;
	min-height: 0;
	height: 100%;
}

.sidebarResizeInner {
	min-height: 0;
	flex: 1;
}

.chatArea {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-1);
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
	gap: var(--spacing--xs);
	flex-shrink: 0;
}

.discoverButton {
	white-space: nowrap;
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

.inputConstraint {
	max-width: 750px;
	margin: 0 auto;
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
