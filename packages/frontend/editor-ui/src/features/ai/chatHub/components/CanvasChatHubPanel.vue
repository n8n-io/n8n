<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nScrollArea, N8nText, N8nTooltip } from '@n8n/design-system';
import { useClipboard, useScroll } from '@vueuse/core';
import { useToast } from '@/app/composables/useToast';
import type { ChatHubSendMessageRequest, ChatModelDto, ChatSessionId } from '@n8n/api-types';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useChatStore } from '../chat.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useChatPushHandler } from '../composables/useChatPushHandler';
import { isWaitingForApproval } from '../chat.utils';
import ChatMessage from './ChatMessage.vue';
import ChatPrompt from './ChatPrompt.vue';
import ChatGreetings from './ChatGreetings.vue';
import ChatAgentAvatar from './ChatAgentAvatar.vue';
import CanvasChatSessionDropdown from './CanvasChatSessionDropdown.vue';
import type { ChatMessage as ChatMessageType, MessagingState } from '../chat.types';

const props = withDefaults(
	defineProps<{
		floating?: boolean;
	}>(),
	{ floating: false },
);

const emit = defineEmits<{
	close: [];
	'pop-out': [];
}>();

const i18n = useI18n();
const chatStore = useChatStore();
const workflowsStore = useWorkflowsStore();
const chatPanelStore = useChatPanelStore();
const clipboard = useClipboard();
const toast = useToast();

const canPopOut = computed(() => window.parent === window);
const isPoppedOut = computed(() => chatPanelStore.isPoppedOut);

// Session management - one session per panel instance, keyed to the workflow
const sessionId = ref<ChatSessionId>(uuidv4());

// Initialize WebSocket push handler for chat streaming
const chatPushHandler = useChatPushHandler();

onBeforeMount(() => {
	chatPushHandler.initialize();
});

onBeforeUnmount(() => {
	chatPushHandler.terminate();
});

const inputRef = useTemplateRef('inputRef');
const scrollableRef = useTemplateRef('scrollable');
const scrollContainerRef = computed(() => scrollableRef.value?.parentElement ?? null);

// Resolve agent name from Chat Trigger node parameters, falling back to workflow name
const chatTriggerNode = computed(() =>
	workflowsStore.allNodes.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE),
);

const agentDisplayName = computed(() => {
	const triggerName = chatTriggerNode.value?.parameters?.agentName;
	if (typeof triggerName === 'string' && triggerName.trim()) return triggerName.trim();
	return workflowsStore.workflowName || 'Workflow';
});

// Auto-select the current workflow as the n8n agent
const selectedModel = computed<ChatModelDto | null>(() => {
	const workflowId = workflowsStore.workflowId;
	if (!workflowId) return null;

	return chatStore.getAgent(
		{ provider: 'n8n', workflowId },
		{ name: agentDisplayName.value, icon: null },
	);
});

const chatMessages = computed(() => chatStore.getActiveMessages(sessionId.value));
const isResponding = computed(() => chatStore.isResponding(sessionId.value));
const isNewSession = computed(() => chatMessages.value.length === 0);

const sessionIdText = computed(() =>
	i18n.baseText('chat.window.session.id', {
		interpolate: { id: `${sessionId.value.slice(0, 5)}...` },
	}),
);

async function copySessionId() {
	await clipboard.copy(sessionId.value);
	toast.showMessage({
		title: i18n.baseText('generic.copiedToClipboard'),
		message: '',
		type: 'success',
	});
}

function handleNewSession() {
	sessionId.value = uuidv4();
}

async function handleSelectSession(selectedSessionId: ChatSessionId) {
	sessionId.value = selectedSessionId;
	if (!chatStore.getConversation(selectedSessionId)) {
		try {
			await chatStore.fetchMessages(selectedSessionId);
			const result = await chatStore.reconnectToStream(selectedSessionId, 0);
			if (result?.hasActiveStream && result.currentMessageId) {
				chatPushHandler.initializeStreamState(
					selectedSessionId,
					result.currentMessageId,
					result.lastSequenceNumber,
				);
			}
		} catch {
			sessionId.value = uuidv4();
		}
	}
}

const messagingState = computed<MessagingState>(() => {
	if (chatStore.streaming?.sessionId === sessionId.value) {
		return chatStore.streaming.messageId ? 'receiving' : 'waitingFirstChunk';
	}

	if (isWaitingForApproval(chatStore.lastMessage(sessionId.value))) {
		return 'waitingForApproval';
	}

	return 'idle';
});

const { arrivedState, measure } = useScroll(scrollContainerRef, {
	throttle: 100,
	offset: { bottom: 100 },
});

// Scroll to the bottom when a new message is added
watch(
	() => chatMessages.value[chatMessages.value.length - 1]?.id,
	(lastMessageId) => {
		if (!lastMessageId) return;

		void nextTick(measure);

		if (chatStore.streaming?.sessionId === sessionId.value) {
			scrollToMessage(chatStore.streaming.promptId);
			return;
		}

		scrollToBottom(false);
	},
	{ immediate: true, flush: 'post' },
);

// Reset session when workflow changes
watch(
	() => workflowsStore.workflowId,
	() => {
		sessionId.value = uuidv4();
	},
);

function scrollToBottom(smooth: boolean) {
	scrollContainerRef.value?.scrollTo({
		top: scrollableRef.value?.scrollHeight,
		behavior: smooth ? 'smooth' : 'instant',
	});
}

function scrollToMessage(messageId: string) {
	scrollableRef.value?.querySelector(`[data-message-id="${messageId}"]`)?.scrollIntoView({
		behavior: 'smooth',
	});
}

async function onSubmit(message: string, attachments: File[]) {
	if (!message.trim() || isResponding.value || !selectedModel.value) return;

	await chatStore.sendMessage(
		sessionId.value,
		message,
		selectedModel.value,
		{} as ChatHubSendMessageRequest['credentials'],
		attachments,
	);

	inputRef.value?.reset();
}

async function onStop() {
	await chatStore.stopStreamingMessage(sessionId.value);
}

async function handleRegenerateMessage(message: ChatMessageType) {
	if (isResponding.value || message.type !== 'ai' || !selectedModel.value) return;

	await chatStore.regenerateMessage(
		sessionId.value,
		message.id,
		selectedModel.value,
		{} as ChatHubSendMessageRequest['credentials'],
	);
}

function focusInput() {
	inputRef.value?.focus();
}

defineExpose({
	focusInput,
	sessionId,
	sessionIdText,
	handleNewSession,
	handleSelectSession,
	copySessionId,
});
</script>

<template>
	<div
		:class="[
			$style.panel,
			{
				[$style.fullscreen]: chatPanelStore.isFullscreen,
				[$style.poppedOut]: isPoppedOut,
				[$style.floating]: props.floating,
			},
		]"
	>
		<div v-if="!props.floating" :class="$style.header">
			<div :class="$style.headerTitle">
				<ChatAgentAvatar :agent="selectedModel" size="sm" />
				<N8nText size="medium" :bold="true" :class="$style.headerTitleText">
					{{ agentDisplayName }}
				</N8nText>
				<span :class="$style.previewBadge">
					{{ i18n.baseText('chatHub.canvas.previewBadge') }}
				</span>
			</div>
			<div :class="$style.headerActions">
				<CanvasChatSessionDropdown
					:session-id="sessionId"
					:session-title="sessionIdText"
					:workflow-id="workflowsStore.workflowId"
					@select-session="handleSelectSession"
				/>
				<N8nTooltip placement="bottom">
					<template #content>
						{{ sessionId }}
						<br />
						{{ i18n.baseText('chat.window.session.id.copy') }}
					</template>
					<N8nIconButton
						icon="copy"
						variant="ghost"
						size="small"
						data-test-id="canvas-chat-session-id"
						@click="copySessionId"
					/>
				</N8nTooltip>
				<N8nTooltip placement="bottom">
					<template #content>
						{{ i18n.baseText('chat.window.session.resetSession') }}
					</template>
					<N8nIconButton
						icon="undo-2"
						variant="ghost"
						size="small"
						data-test-id="canvas-chat-hub-new-session"
						@click="handleNewSession"
					/>
				</N8nTooltip>
				<N8nTooltip v-if="canPopOut && !isPoppedOut" placement="bottom">
					<template #content>
						{{ i18n.baseText('runData.panel.actions.popOut') }}
					</template>
					<N8nIconButton
						icon="external-link"
						variant="ghost"
						size="small"
						data-test-id="canvas-chat-hub-pop-out"
						@click="emit('pop-out')"
					/>
				</N8nTooltip>
				<N8nIconButton
					v-if="!isPoppedOut"
					:icon="chatPanelStore.isFullscreen ? 'minimize-2' : 'expand'"
					variant="ghost"
					size="small"
					data-test-id="canvas-chat-hub-fullscreen"
					@click="chatPanelStore.toggleFullscreen()"
				/>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					data-test-id="canvas-chat-hub-close"
					@click="emit('close')"
				/>
			</div>
		</div>

		<N8nScrollArea
			type="scroll"
			:enable-vertical-scroll="true"
			:enable-horizontal-scroll="false"
			as-child
			:class="$style.scrollArea"
		>
			<div
				ref="scrollable"
				:class="{ [$style.scrollable]: true, [$style.isNewSession]: isNewSession }"
			>
				<ChatGreetings v-if="isNewSession" :selected-agent="selectedModel" />

				<div v-else role="log" aria-live="polite" :class="$style.messageList">
					<ChatMessage
						v-for="message in chatMessages"
						:key="message.id"
						:message="message"
						:compact="false"
						:is-editing="false"
						:is-edit-submitting="false"
						:has-session-streaming="isResponding"
						:cached-agent-display-name="selectedModel?.name ?? null"
						:cached-agent-icon="selectedModel?.icon ?? null"
						@regenerate="handleRegenerateMessage"
					/>
				</div>

				<div :class="$style.promptContainer">
					<N8nIconButton
						v-if="!arrivedState.bottom && !isNewSession"
						variant="subtle"
						icon="arrow-down"
						:class="$style.scrollToBottomButton"
						:title="i18n.baseText('chatHub.chat.scrollToBottom')"
						@click="scrollToBottom(true)"
					/>

					<ChatPrompt
						ref="inputRef"
						:class="$style.prompt"
						:selected-model="selectedModel"
						:checked-tool-ids="[]"
						:messaging-state="messagingState"
						:is-tools-selectable="false"
						:is-new-session="isNewSession"
						:show-credits-claimed-callout="false"
						ai-credits-quota="0"
						@submit="onSubmit"
						@stop="onStop"
					/>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	background-color: var(--color--background--light-2);
	border-left: var(--border);

	&.poppedOut {
		border-left: none;
	}

	&.floating {
		border-left: none;
	}
}

.header {
	height: 65px; // same as header height in editor
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.headerTitleText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--xs);
	flex-shrink: 0;
}

.previewBadge {
	flex-shrink: 0;
	display: inline-block;
	color: var(--color--secondary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--secondary--tint-2);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: 16px;
}

.scrollArea {
	flex-grow: 1;
	flex-shrink: 1;
}

.scrollable {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: start;
	gap: var(--spacing--xl);

	&.isNewSession {
		justify-content: center;
	}
}

.messageList {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-top: var(--spacing--xl);
	padding-bottom: 200px;
	padding-inline: 64px;
}

.promptContainer {
	display: flex;
	justify-content: center;
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	padding-block: var(--spacing--md);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
}

.prompt {
	width: 100%;
	padding-inline: var(--spacing--lg);
}

.scrollToBottomButton {
	position: absolute;
	bottom: 100%;
	left: auto;
	box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
	border-radius: 50%;
}

.fullscreen {
	.scrollable {
		max-width: 768px;
		margin-inline: auto;
	}

	.promptContainer {
		max-width: 768px;
		left: 50%;
		transform: translateX(-50%);
	}
}
</style>
