<script setup lang="ts">
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';
import { useI18n } from '@n8n/i18n';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import MessageOptionTooltip from './MessageOptionTooltip.vue';
import MessageOptionAction from './MessageOptionAction.vue';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ArrowKeyDownPayload } from '@n8n/chat/components/Input.vue';
import ChatInput from '@n8n/chat/components/Input.vue';
import { computed, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useToast } from '@/composables/useToast';
import LogsPanelHeader from '@/features/logs/components/LogsPanelHeader.vue';
import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
interface Props {
	pastChatMessages: string[];
	messages: ChatMessage[];
	sessionId: string;
	showCloseButton?: boolean;
	isOpen?: boolean;
	isReadOnly?: boolean;
	isHeaderClickable: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isOpen: true,
	isReadOnly: false,
});

const emit = defineEmits<{
	displayExecution: [id: string];
	sendMessage: [message: string];
	refreshSession: [];
	close: [];
	clickHeader: [];
}>();

const clipboard = useClipboard();

const locale = useI18n();
const toast = useToast();

// -1 is a special value meaning we are not navigating history,
// 0 is the oldest message, pastChatMessages.length - 1 is the most recent message
const previousMessageIndex = ref(-1);

// Buffer to hold current input when navigating history
const currentInputBuffer = ref('');

const sessionIdText = computed(() =>
	locale.baseText('chat.window.session.id', {
		interpolate: { id: `${props.sessionId.slice(0, 5)}...` },
	}),
);

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
	previousMessageIndex.value = -1;
	currentInputBuffer.value = '';
	emit('sendMessage', message);
}

function onRefreshSession() {
	emit('refreshSession');
}

function onArrowKeyDown({ currentInputValue, key }: ArrowKeyDownPayload) {
	const pastMessages = props.pastChatMessages;

	// Exit if no messages
	if (pastMessages.length === 0) return;

	// Reset navigation if input is empty (message was just sent)
	if (currentInputValue.length === 0 && previousMessageIndex.value !== -1) {
		previousMessageIndex.value = -1;
		currentInputBuffer.value = '';
	}

	// Save current input if we're starting navigation
	if (previousMessageIndex.value === -1 && currentInputValue.length > 0) {
		currentInputBuffer.value = currentInputValue;
	}

	if (key === 'ArrowUp') {
		// Temporarily blur to avoid cursor position issues
		chatEventBus.emit('blurInput');

		if (previousMessageIndex.value === -1) {
			// Start with most recent message (last in array)
			previousMessageIndex.value = pastMessages.length - 1;
		} else if (previousMessageIndex.value > 0) {
			// Move backwards through history (older messages)
			previousMessageIndex.value--;
		}

		// Get message at current index
		const selectedMessage = pastMessages[previousMessageIndex.value];
		chatEventBus.emit('setInputValue', selectedMessage);

		// Refocus and move cursor to end
		chatEventBus.emit('focusInput');
	} else if (key === 'ArrowDown') {
		// Only navigate if we're in history mode
		if (previousMessageIndex.value === -1) return;

		// Temporarily blur to avoid cursor position issues
		chatEventBus.emit('blurInput');

		if (previousMessageIndex.value < pastMessages.length - 1) {
			// Move forward through history (newer messages)
			previousMessageIndex.value++;
			const selectedMessage = pastMessages[previousMessageIndex.value];
			chatEventBus.emit('setInputValue', selectedMessage);
		} else {
			// Reached the end - restore original input or clear
			previousMessageIndex.value = -1;
			chatEventBus.emit('setInputValue', currentInputBuffer.value);
			currentInputBuffer.value = '';
		}

		// Refocus and move cursor to end
		chatEventBus.emit('focusInput');
	}
}

function onEscapeKey() {
	// Only handle escape if we're in history navigation mode
	if (previousMessageIndex.value === -1) return;

	// Exit history mode and restore original input
	previousMessageIndex.value = -1;
	chatEventBus.emit('setInputValue', currentInputBuffer.value);
	currentInputBuffer.value = '';
}

async function copySessionId() {
	await clipboard.copy(props.sessionId);
	toast.showMessage({
		title: locale.baseText('generic.copiedToClipboard'),
		message: '',
		type: 'success',
	});
}
</script>

<template>
	<div
		:class="$style.chat"
		data-test-id="workflow-lm-chat-dialog"
		class="ignore-key-press-canvas"
		tabindex="0"
	>
		<LogsPanelHeader
			data-test-id="chat-header"
			:title="locale.baseText('chat.window.title')"
			:is-clickable="isHeaderClickable"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip v-if="clipboard.isSupported && !isReadOnly">
					<template #content>
						{{ sessionId }}
						<br />
						{{ locale.baseText('chat.window.session.id.copy') }}
					</template>
					<N8nButton
						data-test-id="chat-session-id"
						type="secondary"
						size="mini"
						:class="$style.newHeaderButton"
						@click.stop="copySessionId"
						>{{ sessionIdText }}</N8nButton
					>
				</N8nTooltip>
				<N8nTooltip
					v-if="messages.length > 0 && !isReadOnly"
					:content="locale.baseText('chat.window.session.resetSession')"
				>
					<N8nIconButton
						:class="$style.newHeaderButton"
						data-test-id="refresh-session-button"
						outline
						type="secondary"
						size="small"
						icon-size="medium"
						icon="undo-2"
						:title="locale.baseText('chat.window.session.reset')"
						@click.stop="onRefreshSession"
					/>
				</N8nTooltip>
			</template>
		</LogsPanelHeader>
		<main v-if="isOpen" :class="$style.chatBody" data-test-id="canvas-chat-body">
			<MessagesList
				:messages="messages"
				:class="$style.messages"
				:empty-text="locale.baseText('chat.window.chat.emptyChatMessage.v2')"
			>
				<template #beforeMessage="{ message }">
					<MessageOptionTooltip
						v-if="!isReadOnly && message.sender === 'bot' && !message.id.includes('preload')"
						placement="right"
						data-test-id="execution-id-tooltip"
					>
						{{ locale.baseText('chat.window.chat.chatMessageOptions.executionId') }}:
						<a href="#" @click="emit('displayExecution', message.id)">{{ message.id }}</a>
					</MessageOptionTooltip>

					<MessageOptionAction
						v-if="!isReadOnly && isTextMessage(message) && message.sender === 'user'"
						data-test-id="repost-message-button"
						icon="redo-2"
						:label="locale.baseText('chat.window.chat.chatMessageOptions.repostMessage')"
						placement="left"
						@click.once="repostMessage(message)"
					/>

					<MessageOptionAction
						v-if="!isReadOnly && isTextMessage(message) && message.sender === 'user'"
						data-test-id="reuse-message-button"
						icon="files"
						:label="locale.baseText('chat.window.chat.chatMessageOptions.reuseMessage')"
						placement="left"
						@click="reuseMessage(message)"
					/>
				</template>
			</MessagesList>
		</main>

		<div v-if="isOpen" :class="$style.messagesInput">
			<ChatInput
				data-test-id="lm-chat-inputs"
				:placeholder="inputPlaceholder"
				@arrow-key-down="onArrowKeyDown"
				@escape-key-down="onEscapeKey"
			>
				<template v-if="pastChatMessages.length > 0" #leftPanel>
					<div :class="$style.messagesHistory">
						<N8nButton
							title="Navigate to previous message"
							icon="chevron-up"
							type="tertiary"
							text
							size="mini"
							:disabled="previousMessageIndex === 0"
							@click="onArrowKeyDown({ currentInputValue: '', key: 'ArrowUp' })"
						/>
						<N8nButton
							title="Navigate to next message"
							icon="chevron-down"
							type="tertiary"
							text
							size="mini"
							:disabled="previousMessageIndex === -1"
							@click="onArrowKeyDown({ currentInputValue: '', key: 'ArrowDown' })"
						/>
					</div>
				</template>
			</ChatInput>
		</div>
	</div>
</template>

<style lang="scss" module>
.chat {
	--chat--spacing: var(--spacing--xs);
	--chat--message--padding: var(--spacing--2xs);
	--chat--message--font-size: var(--font-size--2xs);
	--chat--input--font-size: var(--font-size--sm);
	--chat--input--placeholder--font-size: var(--font-size--xs);
	--chat--message--bot--background: transparent;
	--chat--message--user--background: var(--color--text--tint-2);
	--chat--message--bot--color: var(--color--text--shade-1);
	--chat--message--user--color: var(--color--text--shade-1);
	--chat--message--bot--border: none;
	--chat--message--user--border: none;
	--chat--message--user--border: none;
	--chat--input--padding: var(--spacing--xs);
	--chat--color-typing: var(--color--text--tint-1);
	--chat--textarea--max-height: calc(var(--logs-panel-height) * 0.3);
	--chat--message--pre--background: var(--color--foreground--tint-1);
	--chat--textarea--height: calc(
		var(--chat--input--padding) * 2 + var(--chat--input--font-size) *
			var(--chat--input--line-height)
	);
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color--background--light-2);
}

.chatHeader {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color--foreground);
	padding: var(--chat--spacing);
	background-color: var(--color--foreground--tint-2);
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chatTitle {
	font-weight: var(--font-weight--medium);
}

.session {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text);
	max-width: 70%;
}

.sessionId {
	display: inline-block;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;

	&.copyable {
		cursor: pointer;
	}
}

.headerButton {
	max-height: 1.1rem;
	border: none;
}

.newHeaderButton {
	border: none;
	color: var(--color--text--tint-1);
}

.chatBody {
	display: flex;
	height: 100%;
	overflow: auto;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.messages {
	border-radius: var(--radius);
	height: 100%;
	width: 100%;
	overflow: auto;
	padding-top: var(--spacing--lg);

	&:not(:last-child) {
		margin-right: 1em;
	}
}

.messagesInput {
	--input-border-color: var(--border-color);
	--chat--input--border: none;

	--chat--input--border-radius: 0.5rem;
	--chat--input--send--button--background: transparent;
	--chat--input--send--button--color: var(--color--primary);
	--chat--input--file--button--background: transparent;
	--chat--input--file--button--color: var(--color--primary);
	--chat--input--border-active: var(--input-focus-border-color, var(--color--secondary));
	--chat--files-spacing: var(--spacing--2xs);
	--chat--input--background: transparent;
	--chat--input--file--button--color: var(--color-button-secondary-font);
	--chat--input--file--button--color-hover: var(--color--primary);

	padding: var(--spacing--5xs);
	margin: 0 var(--chat--spacing) var(--chat--spacing);
	flex-grow: 1;
	display: flex;
	background: var(--color-lm-chat-bot-background);
	border-radius: var(--chat--input--border-radius);
	transition: border-color 200ms ease-in-out;
	border: var(--input-border-color, var(--border-color))
		var(--input-border-style, var(--border-style)) var(--input-border-width, var(--border-width));

	[data-theme='dark'] & {
		--chat--input--text-color: var(--input-font-color, var(--color--text--shade-1));
	}
	@media (prefers-color-scheme: dark) {
		--chat--input--text-color: var(--input-font-color, var(--color--text--shade-1));
	}

	&:focus-within {
		--input-border-color: #4538a3;
	}
}

.messagesHistory {
	height: var(--chat--textarea--height);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
</style>
