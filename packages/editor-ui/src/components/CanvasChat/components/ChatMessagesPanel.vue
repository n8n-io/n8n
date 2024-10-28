<script setup lang="ts">
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';
import { useI18n } from '@/composables/useI18n';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import MessageOptionTooltip from './MessageOptionTooltip.vue';
import MessageOptionAction from './MessageOptionAction.vue';
import { chatEventBus } from '@n8n/chat/event-buses';
import ChatInput from '@n8n/chat/components/Input.vue';

interface Props {
	messages: ChatMessage[];
}

defineProps<Props>();
const emit = defineEmits<{
	displayExecution: [id: string];
	sendMessage: [message: string];
}>();

const locale = useI18n();

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
	emit('sendMessage', message);
}
</script>

<template>
	<div :class="$style.chat" data-test-id="workflow-lm-chat-dialog">
		<header :class="$style.chatHeader">Chat</header>
		<main :class="$style.chatBody">
			<MessagesList :messages="messages" :class="[$style.messages, 'ignore-key-press']">
				<template #beforeMessage="{ message }">
					<MessageOptionTooltip
						v-if="message.sender === 'bot' && !message.id.includes('preload')"
						placement="right"
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
						@click="repostMessage(message)"
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
		<ChatInput :class="$style.messagesInput" data-test-id="lm-chat-inputs" />
	</div>
</template>

<style lang="scss" module>
.chat {
	--chat--spacing: var(--spacing-xs);
	--chat--message--padding: var(--spacing-xs);
	--chat--message--font-size: var(--font-size-2xs);
	--chat--message--bot--background: transparent;
	--chat--message--user--background: var(--color-text-lighter);
	--chat--message--bot--color: var(--color-text-dark);
	--chat--message--user--color: var(--color-text-dark);
	--chat--message--bot--border: none;
	--chat--message--user--border: none;
	--chat--color-typing: var(--color-text-dark);

	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color-background-light);
}
.chatHeader {
	font-size: var(--font-size-m);
	font-weight: 400;
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color-foreground-base);
	padding: var(--chat--spacing);
	background-color: var(--color-foreground-xlight);
}
.chatBody {
	display: flex;
	height: 100%;
	overflow: auto;

	& ::-webkit-scrollbar {
		width: 4px;
	}

	& ::-webkit-scrollbar-thumb {
		border-radius: var(--border-radius-base);
		background: var(--color-foreground-dark);
		border: 1px solid white;
	}

	& ::-webkit-scrollbar-thumb:hover {
		background: var(--color-foreground-xdark);
	}
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
	--input-border-color: #4538a3;
	--chat--input--border: var(--input-border-color, var(--border-color-base))
		var(--input-border-style, var(--border-style-base))
		var(--input-border-width, var(--border-width-base));

	--chat--input--border-radius: 1.5rem;
	--chat--input--send--button--background: transparent;
	--chat--input--send--button--color: var(--color-button-secondary-font);
	--chat--input--send--button--color-hover: var(--color-primary);
	--chat--input--border-active: var(--input-focus-border-color, var(--color-secondary));
	--chat--files-spacing: var(--spacing-2xs) 0;
	--chat--input--background: var(--color-lm-chat-bot-background);

	[data-theme='dark'] & {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}
	@media (prefers-color-scheme: dark) {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}
	border-radius: 5rem;
	padding: var(--chat--spacing);
	margin-bottom: var(--spacing-4xs);
	overflow: hidden;
	flex-grow: 1;
}
</style>
