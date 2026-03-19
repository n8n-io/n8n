<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { N8nIconButton, N8nScrollArea } from '@n8n/design-system';
import { useScroll } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useCanvasContext } from '../composables/useCanvasContext';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowUpdate } from '@/app/composables/useWorkflowUpdate';
import InstanceAiMessage from './InstanceAiMessage.vue';
import InstanceAiInput from './InstanceAiInput.vue';
import InstanceAiEmptyState from './InstanceAiEmptyState.vue';
import InstanceAiStatusBar from './InstanceAiStatusBar.vue';
import InstanceAiThreadPicker from './InstanceAiThreadPicker.vue';

const emit = defineEmits<{
	close: [];
}>();

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const { canvasContext } = useCanvasContext();
const { updateWorkflow } = useWorkflowUpdate();

const workflowId = computed(() => workflowsStore.workflowId);

// --- Thread picker ---

const currentLabel = computed(() => {
	const thread = store.threads.find((t) => t.id === store.currentThreadId);
	if (thread?.workflowId) {
		return thread.title || workflowsStore.workflowName;
	}
	if (thread) {
		return thread.title || i18n.baseText('instanceAi.threadPicker.global');
	}
	// Fallback: use workflow name if we have a workflowId, otherwise generic title
	return workflowId.value ? workflowsStore.workflowName : i18n.baseText('instanceAi.view.title');
});

function handleThreadSelect(_threadId: string, threadWorkflowId?: string) {
	if (threadWorkflowId) {
		void store.ensureWorkflowThread(threadWorkflowId);
	} else {
		void store.switchToGlobalThread();
	}
}

// --- Lifecycle ---

onMounted(() => {
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

	// Resolve workflow-scoped thread (falls back to global for unsaved workflows)
	void store.ensureWorkflowThread(workflowId.value);

	// Load threads so the picker has data
	void store.loadThreads();
});

onUnmounted(() => {
	contentResizeObserver?.disconnect();
	inputResizeObserver?.disconnect();
	store.closeSSE();
	settingsStore.stopDaemonProbing();
	settingsStore.stopGatewayPolling();
	settingsStore.stopGatewayPushListener();
});

// --- Scroll management ---

const scrollableRef = useTemplateRef<HTMLElement>('scrollable');
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

// Auto-scroll when content height changes
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
let inputResizeObserver: ResizeObserver | null = null;

watch(
	inputContainerRef,
	(el) => {
		inputResizeObserver?.disconnect();
		if (el) {
			inputResizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					inputAreaHeight.value = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
				}
			});
			inputResizeObserver.observe(el);
		}
	},
	{ immediate: true },
);

// --- Workflow update from AI agent ---

watch(
	() => store.pendingWorkflowUpdate,
	async (pending) => {
		if (!pending) return;
		// Only apply if the update targets the currently open workflow
		if (pending.workflowId !== workflowId.value) return;

		const update = store.consumeWorkflowUpdate();
		if (!update) return;

		await updateWorkflow(update.workflowData as WorkflowDataUpdate);
	},
);

// --- Message handlers ---

async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	userScrolledUp.value = false;
	await store.sendMessage(message, attachments, canvasContext.value);
}

function handleSuggestionSelect(prompt: string) {
	void handleSubmit(prompt);
}

function handleStop() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.panel" data-test-id="instance-ai-canvas-panel">
		<!-- Header -->
		<div :class="$style.header">
			<InstanceAiThreadPicker
				:current-thread-id="store.currentThreadId"
				:threads="store.threads"
				:current-label="currentLabel"
				@select="handleThreadSelect"
			/>
			<N8nIconButton
				icon="times"
				variant="ghost"
				size="small"
				data-test-id="instance-ai-canvas-panel-close"
				@click="emit('close')"
			/>
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
			<InstanceAiStatusBar />
			<InstanceAiInput
				:is-streaming="store.isStreaming"
				@submit="handleSubmit"
				@stop="handleStop"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	position: relative;
	background-color: var(--color--background--light-2);
}

.header {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.scrollArea {
	flex: 1;
	min-height: 0;
}

.messageList {
	padding: var(--spacing--sm);
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
	padding: 0 var(--spacing--sm) var(--spacing--2xs);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
	pointer-events: none;
	z-index: 2;

	& > * {
		pointer-events: auto;
	}
}
</style>
