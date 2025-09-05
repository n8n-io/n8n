<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import MessageWrapper from './messages/MessageWrapper.vue';
import { useI18n } from '../../composables/useI18n';
import type { ChatUI, RatingFeedback } from '../../types/assistant';
import { isToolMessage } from '../../types/assistant';
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';
import AssistantLoadingMessage from '../AskAssistantLoadingMessage/AssistantLoadingMessage.vue';
import AssistantText from '../AskAssistantText/AssistantText.vue';
import InlineAskAssistantButton from '../InlineAskAssistantButton/InlineAskAssistantButton.vue';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import { getSupportedMessageComponent } from './messages/helpers';

const { t } = useI18n();

const MAX_CHAT_INPUT_HEIGHT = 100;

interface Props {
	user?: {
		firstName: string;
		lastName: string;
	};
	messages?: ChatUI.AssistantMessage[];
	streaming?: boolean;
	disabled?: boolean;
	loadingMessage?: string;
	sessionId?: string;
	title?: string;
	placeholder?: string;
	scrollOnNewMessage?: boolean;
	showStop?: boolean;
	maxLength?: number;
}

const emit = defineEmits<{
	close: [];
	stop: [];
	message: [string, string?, boolean?];
	codeReplace: [number];
	codeUndo: [number];
	feedback: [RatingFeedback];
}>();

const onClose = () => emit('close');

const props = withDefaults(defineProps<Props>(), {
	title: () => useI18n().t('assistantChat.aiAssistantLabel'),
	user: () => ({
		firstName: '',
		lastName: '',
	}),
	messages: () => [],
	loadingMessage: undefined,
	sessionId: undefined,
	scrollOnNewMessage: false,
});

function normalizeMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	return messages.map((msg, index) => ({
		...msg,
		id: msg.id || `msg-${index}`,
		read: msg.read ?? true,
	}));
}

// filter out these messages so that tool collapsing works correctly
function filterOutHiddenMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	return messages.filter(
		(message) => Boolean(getSupportedMessageComponent(message.type)) || message.type === 'custom',
	);
}

function collapseToolMessages(messages: ChatUI.AssistantMessage[]): ChatUI.AssistantMessage[] {
	const result: ChatUI.AssistantMessage[] = [];
	let i = 0;

	while (i < messages.length) {
		const currentMsg = messages[i];

		// If it's not a tool message, add it as-is and continue
		if (!isToolMessage(currentMsg)) {
			result.push(currentMsg);
			i++;
			continue;
		}

		// Collect consecutive tool messages with the same toolName
		const toolMessagesGroup = [currentMsg];
		let j = i + 1;

		while (j < messages.length) {
			const nextMsg = messages[j];
			if (isToolMessage(nextMsg) && nextMsg.toolName === currentMsg.toolName) {
				toolMessagesGroup.push(nextMsg);
				j++;
			} else {
				break;
			}
		}

		// If we have multiple tool messages with the same toolName, collapse them
		if (toolMessagesGroup.length > 1) {
			// Determine the status to show based on priority rules
			const lastMessage = toolMessagesGroup[toolMessagesGroup.length - 1];
			let titleSource = lastMessage;

			// Check if we have running messages - if so, show the last running one and use its titles
			const runningMessages = toolMessagesGroup.filter((msg) => msg.status === 'running');
			const errorMessage = toolMessagesGroup.find((msg) => msg.status === 'error');
			if (runningMessages.length > 0) {
				const lastRunning = runningMessages[runningMessages.length - 1];
				titleSource = lastRunning;
			} else if (errorMessage) {
				titleSource = errorMessage;
			}

			// Combine all updates from all tool messages
			const combinedUpdates = toolMessagesGroup.flatMap((msg) => msg.updates || []);

			// Create collapsed message with title logic based on final status
			const collapsedMessage: ChatUI.ToolMessage = {
				...lastMessage,
				status: titleSource.status,
				updates: combinedUpdates,
				displayTitle: titleSource.displayTitle,
				// Only set customDisplayTitle if status is running (for example "Adding X node")
				customDisplayTitle:
					titleSource.status === 'running' ? titleSource.customDisplayTitle : undefined,
			};

			result.push(collapsedMessage);
		} else {
			// Single tool message, add as-is
			result.push(currentMsg);
		}

		i = j;
	}

	return result;
}

// Ensure all messages have required id and read properties, and collapse tool messages
const normalizedMessages = computed(() => {
	const normalized = normalizeMessages(props.messages);
	return collapseToolMessages(filterOutHiddenMessages(normalized));
});

// Get quickReplies from the last message in the original messages (before filtering)
const lastMessageQuickReplies = computed(() => {
	if (!props.messages?.length || props.streaming) return [];

	const lastMessage = props.messages[props.messages.length - 1];
	return 'quickReplies' in lastMessage && lastMessage.quickReplies?.length
		? lastMessage.quickReplies
		: [];
});

const textInputValue = ref<string>('');

const chatInput = ref<HTMLTextAreaElement | null>(null);
const messagesRef = ref<HTMLDivElement | null>(null);

const sessionEnded = computed(() => {
	return isEndOfSessionEvent(props.messages?.[props.messages.length - 1]);
});

const sendDisabled = computed(() => {
	return !textInputValue.value || props.streaming || sessionEnded.value || props.disabled;
});

const showPlaceholder = computed(() => {
	return !props.messages?.length && !props.loadingMessage && !props.sessionId;
});

function isEndOfSessionEvent(event?: ChatUI.AssistantMessage) {
	return event?.type === 'event' && event?.eventName === 'end-session';
}

function onQuickReply(opt: ChatUI.QuickReply) {
	emit('message', opt.text, opt.type, opt.isFeedback);
}

function onSendMessage() {
	if (sendDisabled.value) return;
	emit('message', textInputValue.value);
	textInputValue.value = '';
	if (chatInput.value) {
		chatInput.value.style.height = 'auto';
	}
}

function growInput() {
	if (!chatInput.value) return;
	chatInput.value.style.height = 'auto';
	const scrollHeight = chatInput.value.scrollHeight;
	chatInput.value.style.height = `${Math.min(scrollHeight, MAX_CHAT_INPUT_HEIGHT)}px`;
}

function onRateMessage(feedback: RatingFeedback) {
	emit('feedback', feedback);
}

function scrollToBottom() {
	if (messagesRef.value) {
		messagesRef.value?.scrollTo({
			top: messagesRef.value.scrollHeight,
			behavior: 'smooth',
		});
	}
}
watch(sendDisabled, () => {
	chatInput.value?.focus();
});
watch(
	() => props.messages,
	async (messages) => {
		// Check if the last message is user and scroll to bottom of the chat
		if (props.scrollOnNewMessage && messages.length > 0) {
			// Wait for DOM updates before scrolling
			await nextTick();
			// Check if messagesRef is available after nextTick
			if (messagesRef.value) {
				scrollToBottom();
			}
		}
	},
	{ immediate: true, deep: true },
);

// Expose focusInput method to parent components
defineExpose({
	focusInput: () => {
		chatInput.value?.focus();
	},
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.chatTitle">
				<div :class="$style.headerText">
					<AssistantIcon size="large" />
					<AssistantText size="large" :text="title" />
				</div>
				<slot name="header" />
			</div>
			<div :class="$style.back" data-test-id="close-chat-button" @click="onClose">
				<N8nIcon icon="arrow-right" color="text-base" />
			</div>
		</div>
		<div :class="$style.body">
			<div
				v-if="normalizedMessages?.length || loadingMessage"
				ref="messagesRef"
				:class="$style.messages"
			>
				<div v-if="normalizedMessages?.length">
					<data
						v-for="(message, i) in normalizedMessages"
						:key="message.id"
						:data-test-id="
							message.role === 'assistant' ? 'chat-message-assistant' : 'chat-message-user'
						"
					>
						<MessageWrapper
							:message="message"
							:is-first-of-role="i === 0 || message.role !== normalizedMessages[i - 1].role"
							:user="user"
							:streaming="streaming"
							:is-last-message="i === normalizedMessages.length - 1"
							@code-replace="() => emit('codeReplace', i)"
							@code-undo="() => emit('codeUndo', i)"
							@feedback="onRateMessage"
						>
							<template v-if="$slots['custom-message']" #custom-message="customMessageProps">
								<slot name="custom-message" v-bind="customMessageProps" />
							</template>
						</MessageWrapper>

						<div
							v-if="lastMessageQuickReplies.length && i === normalizedMessages.length - 1"
							:class="$style.quickReplies"
						>
							<div :class="$style.quickRepliesTitle">
								{{ t('assistantChat.quickRepliesTitle') }}
							</div>
							<div
								v-for="opt in lastMessageQuickReplies"
								:key="opt.type"
								data-test-id="quick-replies"
							>
								<N8nButton
									v-if="opt.text"
									type="secondary"
									size="mini"
									@click="() => onQuickReply(opt)"
								>
									{{ opt.text }}
								</N8nButton>
							</div>
						</div>
					</data>
				</div>
				<div
					v-if="loadingMessage"
					:class="{ [$style.message]: true, [$style.loading]: normalizedMessages?.length }"
				>
					<AssistantLoadingMessage :message="loadingMessage" />
				</div>
			</div>
			<div
				v-else-if="showPlaceholder"
				:class="$style.placeholder"
				data-test-id="placeholder-message"
			>
				<div v-if="$slots.placeholder" :class="$style.info">
					<slot name="placeholder" />
				</div>
				<template v-else>
					<div :class="$style.greeting">Hi {{ user?.firstName }} 👋</div>
					<div :class="$style.info">
						<p>
							{{ t('assistantChat.placeholder.1') }}
						</p>
						<p>
							{{ t('assistantChat.placeholder.2') }}
							<InlineAskAssistantButton size="small" :static="true" />
							{{ t('assistantChat.placeholder.3') }}
						</p>
						<p>
							{{ t('assistantChat.placeholder.4') }}
						</p>
					</div>
				</template>
			</div>
		</div>
		<div
			:class="{ [$style.inputWrapper]: true, [$style.disabledInput]: sessionEnded }"
			data-test-id="chat-input-wrapper"
		>
			<div v-if="$slots.inputPlaceholder" :class="$style.inputPlaceholder">
				<slot name="inputPlaceholder" />
			</div>
			<template v-else>
				<textarea
					ref="chatInput"
					v-model="textInputValue"
					class="ignore-key-press-node-creator ignore-key-press-canvas"
					:class="{ [$style.disabled]: sessionEnded || streaming || disabled }"
					:disabled="sessionEnded || streaming || disabled"
					:placeholder="placeholder ?? t('assistantChat.inputPlaceholder')"
					rows="1"
					wrap="hard"
					:maxlength="maxLength"
					data-test-id="chat-input"
					@keydown.enter.exact.prevent="onSendMessage"
					@input.prevent="growInput"
					@keydown.stop
				/>
				<N8nButton
					v-if="showStop && streaming"
					:class="$style.stopButton"
					icon="square"
					size="large"
					type="danger"
					outline
					square
					data-test-id="send-message-button"
					@click="emit('stop')"
				/>
				<N8nButton
					v-else
					:class="$style.sendButton"
					icon="send"
					:text="true"
					size="large"
					square
					data-test-id="send-message-button"
					:disabled="sendDisabled"
					@click="onSendMessage"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr auto;
}
:root .stopButton {
	--button-border-color: transparent;
}
.header {
	height: 65px; // same as header height in editor
	padding: 0 var(--spacing-l);
	background-color: var(--color-background-xlight);
	border: var(--border-base);
	border-top: 0;
	display: flex;

	div {
		display: flex;
		align-items: center;
	}

	> div:first-of-type {
		width: 100%;
	}
}

.body {
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-top: 0;
	position: relative;

	pre,
	code {
		text-wrap: wrap;
	}
}

.placeholder {
	padding: var(--spacing-s);
}

.messages {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	padding: var(--spacing-xs);
	overflow-y: auto;

	@supports not (selector(::-webkit-scrollbar)) {
		scrollbar-width: thin;
	}
	@supports selector(::-webkit-scrollbar) {
		&::-webkit-scrollbar {
			width: var(--spacing-2xs);
		}
		&::-webkit-scrollbar-thumb {
			border-radius: var(--spacing-xs);
			background: var(--color-foreground-dark);
			border: var(--spacing-5xs) solid white;
		}
	}

	& + & {
		padding-top: 0;
	}
}

.message {
	margin-bottom: var(--spacing-xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);

	&.loading {
		margin-top: var(--spacing-m);
	}
}

.chatTitle {
	display: flex;
	gap: var(--spacing-3xs);
}

.headerText {
	gap: var(--spacing-xs);
}

.greeting {
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
	margin-bottom: var(--spacing-s);
}

.info {
	font-size: var(--font-size-s);
	color: var(--color-text-base);

	button {
		display: inline-flex;
	}
}

.back:hover {
	cursor: pointer;
}

.quickReplies {
	margin-top: var(--spacing-s);
	> * {
		margin-bottom: var(--spacing-3xs);
	}
}

.quickRepliesTitle {
	font-size: var(--font-size-3xs);
	color: var(--color-text-base);
}

.inputWrapper {
	display: flex;
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	width: 100%;
	border-top: 0;

	textarea {
		border: none;
		background-color: transparent;
		width: 100%;
		font-size: var(--spacing-xs);
		padding: var(--spacing-xs);
		outline: none;
		color: var(--color-text-dark);
		resize: none;
		font-family: inherit;
	}
}

.sendButton {
	color: var(--color-text-base) !important;

	&[disabled] {
		color: var(--color-text-light) !important;
	}
}

.disabledInput {
	cursor: not-allowed;

	* {
		cursor: not-allowed;
	}
}

textarea.disabled {
	background-color: var(--color-foreground-base);
	cursor: not-allowed;
}

.inputPlaceholder {
	width: 100%;
}
</style>
