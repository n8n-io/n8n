<script setup lang="ts">
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';
import { useI18n } from '@/composables/useI18n';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import MessageOptionTooltip from './MessageOptionTooltip.vue';
import MessageOptionAction from './MessageOptionAction.vue';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ArrowKeyDownPayload } from '@n8n/chat/components/Input.vue';
import ChatInput from '@n8n/chat/components/Input.vue';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { computed, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useToast } from '@/composables/useToast';

interface Props {
	pastChatMessages: string[];
	messages: ChatMessage[];
	sessionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	displayExecution: [id: string];
	sendMessage: [message: string];
	refreshSession: [];
}>();

const messageComposable = useMessage();
const clipboard = useClipboard();
const locale = useI18n();
const toast = useToast();

const previousMessageIndex = ref(0);

const inputPlaceholder = computed(() => {
	if (props.messages.length > 0) {
		return locale.baseText('chat.window.chat.placeholder');
	}
	return locale.baseText('chat.window.chat.placeholderPristine');
});
/** Checks if message is a text message */
function isTextMessage(message: ChatMessage): message is ChatMessageText {
	return message.type === 'text' || !message.type;
}

/** Reposts the message */
function repostMessage(message: ChatMessageText) {
	void sendMessage(message.text);
}

/** Sets the message in input for reuse */
function reuseMessage(message: ChatMessageText) {
	chatEventBus.emit('setInputValue', message.text);
}

function sendMessage(message: string) {
	previousMessageIndex.value = 0;
	emit('sendMessage', message);
}

async function onRefreshSession() {
	// If there are no messages, refresh the session without asking
	if (props.messages.length === 0) {
		emit('refreshSession');
		return;
	}

	const confirmResult = await messageComposable.confirm(
		locale.baseText('chat.window.session.reset.warning'),
		{
			title: locale.baseText('chat.window.session.reset.title'),
			type: 'warning',
			confirmButtonText: locale.baseText('chat.window.session.reset.confirm'),
			showClose: true,
		},
	);
	if (confirmResult === MODAL_CONFIRM) {
		emit('refreshSession');
	}
}

function onArrowKeyDown({ currentInputValue, key }: ArrowKeyDownPayload) {
	const pastMessages = props.pastChatMessages;
	const isCurrentInputEmptyOrMatch =
		currentInputValue.length === 0 || pastMessages.includes(currentInputValue);

	if (isCurrentInputEmptyOrMatch && (key === 'ArrowUp' || key === 'ArrowDown')) {
		// Exit if no messages
		if (pastMessages.length === 0) return;

		// Temporarily blur to avoid cursor position issues
		chatEventBus.emit('blurInput');

		if (pastMessages.length === 1) {
			previousMessageIndex.value = 0;
		} else {
			if (key === 'ArrowUp') {
				if (currentInputValue.length === 0 && previousMessageIndex.value === 0) {
					// Start with most recent message
					previousMessageIndex.value = pastMessages.length - 1;
				} else {
					// Move backwards through history
					previousMessageIndex.value =
						previousMessageIndex.value === 0
							? pastMessages.length - 1
							: previousMessageIndex.value - 1;
				}
			} else if (key === 'ArrowDown') {
				// Move forwards through history
				previousMessageIndex.value =
					previousMessageIndex.value === pastMessages.length - 1
						? 0
						: previousMessageIndex.value + 1;
			}
		}

		// Get message at current index
		const selectedMessage = pastMessages[previousMessageIndex.value];
		chatEventBus.emit('setInputValue', selectedMessage);

		// Refocus and move cursor to end
		chatEventBus.emit('focusInput');
	}

	// Reset history navigation when typing new content that doesn't match history
	if (!isCurrentInputEmptyOrMatch) {
		previousMessageIndex.value = 0;
	}
}
function copySessionId() {
	void clipboard.copy(props.sessionId);
	toast.showMessage({
		title: locale.baseText('generic.copiedToClipboard'),
		message: '',
		type: 'success',
	});
}
</script>

<template>
	<div :class="$style.chat" data-test-id="workflow-lm-chat-dialog">
		<header :class="$style.chatHeader">
			<span>{{ locale.baseText('chat.window.title') }}</span>
			<div :class="$style.session">
				<span>{{ locale.baseText('chat.window.session.title') }}</span>
				<n8n-tooltip placement="left">
					<template #content>
						{{ sessionId }}
					</template>
					<span :class="$style.sessionId" data-test-id="chat-session-id" @click="copySessionId">{{
						sessionId
					}}</span>
				</n8n-tooltip>
				<n8n-icon-button
					:class="$style.refreshSession"
					data-test-id="refresh-session-button"
					type="tertiary"
					text
					size="mini"
					icon="undo"
					:title="locale.baseText('chat.window.session.reset.confirm')"
					@click="onRefreshSession"
				/>
			</div>
		</header>
		<main :class="$style.chatBody">
			<MessagesList :messages="messages" :class="[$style.messages, 'ignore-key-press-canvas']">
				<template #beforeMessage="{ message }">
					<MessageOptionTooltip
						v-if="message.sender === 'bot' && !message.id.includes('preload')"
						placement="right"
						data-test-id="execution-id-tooltip"
					>
						{{ locale.baseText('chat.window.chat.chatMessageOptions.executionId') }}:
						<a href="#" @click="emit('displayExecution', message.id)">{{ message.id }}</a>
					</MessageOptionTooltip>

					<MessageOptionAction
						v-if="isTextMessage(message) && message.sender === 'user'"
						data-test-id="repost-message-button"
						icon="redo"
						:label="locale.baseText('chat.window.chat.chatMessageOptions.repostMessage')"
						placement="left"
						@click.once="repostMessage(message)"
					/>

					<MessageOptionAction
						v-if="isTextMessage(message) && message.sender === 'user'"
						data-test-id="reuse-message-button"
						icon="copy"
						:label="locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage')"
						placement="left"
						@click="reuseMessage(message)"
					/>
				</template>
			</MessagesList>
		</main>

		<div :class="$style.messagesInput">
			<div v-if="pastChatMessages.length > 0" :class="$style.messagesHistory">
				<n8n-button
					title="Navigate to previous message"
					icon="chevron-up"
					type="tertiary"
					text
					size="mini"
					@click="onArrowKeyDown({ currentInputValue: '', key: 'ArrowUp' })"
				/>
				<n8n-button
					title="Navigate to next message"
					icon="chevron-down"
					type="tertiary"
					text
					size="mini"
					@click="onArrowKeyDown({ currentInputValue: '', key: 'ArrowDown' })"
				/>
			</div>
			<ChatInput
				data-test-id="lm-chat-inputs"
				:placeholder="inputPlaceholder"
				@arrow-key-down="onArrowKeyDown"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.chat {
	--chat--spacing: var(--spacing-xs);
	--chat--message--padding: var(--spacing-xs);
	--chat--message--font-size: var(--font-size-s);
	--chat--input--font-size: var(--font-size-s);
	--chat--message--bot--background: transparent;
	--chat--message--user--background: var(--color-text-lighter);
	--chat--message--bot--color: var(--color-text-dark);
	--chat--message--user--color: var(--color-text-dark);
	--chat--message--bot--border: none;
	--chat--message--user--border: none;
	--chat--color-typing: var(--color-text-light);
	--chat--textarea--max-height: calc(var(--panel-height) * 0.5);
	--chat--message--pre--background: var(--color-foreground-light);

	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color-background-light);
}
.chatHeader {
	font-size: var(--font-size-s);
	font-weight: 400;
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color-foreground-base);
	padding: var(--chat--spacing);
	background-color: var(--color-foreground-xlight);
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.session {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	color: var(--color-text-base);
	max-width: 70%;
}
.sessionId {
	display: inline-block;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;

	cursor: pointer;
}
.refreshSession {
	max-height: 1.1rem;
}
.chatBody {
	display: flex;
	height: 100%;
	overflow: auto;
}

.messages {
	border-radius: var(--border-radius-base);
	height: 100%;
	width: 100%;
	overflow: auto;
	padding-top: 1.5em;

	&:not(:last-child) {
		margin-right: 1em;
	}
}

.messagesInput {
	--input-border-color: var(--border-color-base);
	--chat--input--border: none;

	--chat--input--border-radius: 0.5rem;
	--chat--input--send--button--background: transparent;
	--chat--input--send--button--color: var(--color-primary);
	--chat--input--file--button--background: transparent;
	--chat--input--file--button--color: var(--color-primary);
	--chat--input--border-active: var(--input-focus-border-color, var(--color-secondary));
	--chat--files-spacing: var(--spacing-2xs) 0;
	--chat--input--background: transparent;
	--chat--input--file--button--color: var(--color-button-secondary-font);
	--chat--input--file--button--color-hover: var(--color-primary);

	[data-theme='dark'] & {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}
	@media (prefers-color-scheme: dark) {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}

	padding: 0 0 0 var(--spacing-xs);
	margin: 0 var(--chat--spacing) var(--chat--spacing);
	flex-grow: 1;
	display: flex;
	background: var(--color-lm-chat-bot-background);
	border-radius: var(--chat--input--border-radius);
	transition: border-color 200ms ease-in-out;
	border: var(--input-border-color, var(--border-color-base))
		var(--input-border-style, var(--border-style-base))
		var(--input-border-width, var(--border-width-base));

	&:focus-within {
		--input-border-color: #4538a3;
	}
}

.messagesHistory {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	margin-bottom: var(--spacing-3xs);

	button:first-child {
		margin-top: var(--spacing-4xs);
		margin-bottom: calc(-1 * var(--spacing-4xs));
	}
}
</style>
