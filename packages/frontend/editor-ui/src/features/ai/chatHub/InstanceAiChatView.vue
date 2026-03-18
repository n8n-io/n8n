<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useScroll } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAttachment } from '@n8n/api-types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import { NEW_CONVERSATION_TITLE } from '@/features/ai/instanceAi/constants';
import InstanceAiMessage from '@/features/ai/instanceAi/components/InstanceAiMessage.vue';
import InstanceAiInput from '@/features/ai/instanceAi/components/InstanceAiInput.vue';
import InstanceAiEmptyState from '@/features/ai/instanceAi/components/InstanceAiEmptyState.vue';
import InstanceAiMemoryPanel from '@/features/ai/instanceAi/components/InstanceAiMemoryPanel.vue';
import InstanceAiDebugPanel from '@/features/ai/instanceAi/components/InstanceAiDebugPanel.vue';
import InstanceAiArtifactsPanel from '@/features/ai/instanceAi/components/InstanceAiArtifactsPanel.vue';
import InstanceAiSettingsPanel from '@/features/ai/instanceAi/components/settings/InstanceAiSettingsPanel.vue';
import InstanceAiStatusBar from '@/features/ai/instanceAi/components/InstanceAiStatusBar.vue';
import ChatLayout from '@/features/ai/chatHub/components/ChatLayout.vue';

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const i18n = useI18n();
const route = useRoute();
const documentTitle = useDocumentTitle();

documentTitle.set('Instance AI');

onMounted(() => {
	void store.loadThreads();
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

const showArtifactsPanel = ref(false);
const showMemoryPanel = ref(false);
const showDebugPanel = ref(false);
const showSettingsPanel = ref(false);

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

const routeThreadId = computed(() =>
	typeof route.params.threadId === 'string' ? route.params.threadId : null,
);

watch(
	routeThreadId,
	(threadId) => {
		if (!threadId) {
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
			if (store.sseState === 'disconnected') {
				void store.loadHistoricalMessages(threadId).then(() => {
					void store.loadThreadStatus(threadId);
					store.connectSSE();
				});
			}
			return;
		}
		if (!store.threads.some((t) => t.id === threadId)) {
			store.threads.push({
				id: threadId,
				title: NEW_CONVERSATION_TITLE,
				createdAt: new Date().toISOString(),
			});
		}
		store.switchThread(threadId);
	},
	{ immediate: true },
);

async function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
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
	<ChatLayout :class="$style.chatLayout">
		<div :class="$style.chatArea" data-test-id="instance-ai-chat-container">
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

			<div ref="inputContainer" :class="$style.inputContainer">
				<InstanceAiStatusBar />
				<InstanceAiInput
					:is-streaming="store.isStreaming"
					@submit="handleSubmit"
					@stop="handleStop"
				/>
			</div>

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
	</ChatLayout>
</template>

<style lang="scss" module>
.chatLayout {
	display: flex;
	flex-direction: row;
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
	padding: 0 var(--spacing--lg) var(--spacing--sm);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
	pointer-events: none;
	z-index: 2;

	& > * {
		pointer-events: auto;
	}
}
</style>
