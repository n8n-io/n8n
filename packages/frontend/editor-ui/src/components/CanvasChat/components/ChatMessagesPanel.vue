<script setup lang="ts">
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';
import { useI18n } from '@/composables/useI18n';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import MessageOptionTooltip from './MessageOptionTooltip.vue';
import MessageOptionAction from './MessageOptionAction.vue';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ArrowKeyDownPayload } from '@n8n/chat/components/Input.vue';
import ChatInput from '@n8n/chat/components/Input.vue';
import { computed, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useToast } from '@/composables/useToast';
import PanelHeader from '@/components/CanvasChat/future/components/PanelHeader.vue';
import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';

interface Props {
	pastChatMessages: string[];
	messages: ChatMessage[];
	sessionId: string;
	showCloseButton?: boolean;
	isOpen?: boolean;
	isReadOnly?: boolean;
	isNewLogsEnabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isOpen: true,
	isReadOnly: false,
	isNewLogsEnabled: false,
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

const previousMessageIndex = ref(0);

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
	previousMessageIndex.value = 0;
	emit('sendMessage', message);
}

function onRefreshSession() {
	emit('refreshSession');
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
	<div :class="$style.chat" data-test-id="workflow-lm-chat-dialog">
		<PanelHeader
			v-if="isNewLogsEnabled"
			data-test-id="chat-header"
			:title="locale.baseText('chat.window.title')"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip v-if="clipboard.isSupported.value && !isReadOnly">
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
						icon="undo"
						:title="locale.baseText('chat.window.session.reset')"
						@click.stop="onRefreshSession"
					/>
				</N8nTooltip>
			</template>
		</PanelHeader>
		<header v-else :class="$style.chatHeader">
			<span :class="$style.chatTitle">{{ locale.baseText('chat.window.title') }}</span>
			<div :class="$style.session">
				<span>{{ locale.baseText('chat.window.session.title') }}</span>
				<N8nTooltip placement="left">
					<template #content>
						{{ sessionId }}
					</template>
					<span
						:class="[$style.sessionId, clipboard.isSupported.value ? $style.copyable : '']"
						data-test-id="chat-session-id"
						@click="clipboard.isSupported.value ? copySessionId() : null"
						>{{ sessionId }}</span
					>
				</N8nTooltip>
				<N8nIconButton
					:class="$style.headerButton"
					data-test-id="refresh-session-button"
					outline
					type="secondary"
					size="mini"
					icon="undo"
					:title="locale.baseText('chat.window.session.reset')"
					@click="onRefreshSession"
				/>
				<N8nIconButton
					v-if="showCloseButton"
					:class="$style.headerButton"
					outline
					type="secondary"
					size="mini"
					icon="times"
					@click="emit('close')"
				/>
			</div>
		</header>
		<main v-if="isOpen" :class="$style.chatBody">
			<MessagesList
				:messages="messages"
				:class="$style.messages"
				:empty-text="
					isNewLogsEnabled ? locale.baseText('chat.window.chat.emptyChatMessage.v2') : undefined
				"
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
						icon="redo"
						:label="locale.baseText('chat.window.chat.chatMessageOptions.repostMessage')"
						placement="left"
						@click.once="repostMessage(message)"
					/>

					<MessageOptionAction
						v-if="!isReadOnly && isTextMessage(message) && message.sender === 'user'"
						data-test-id="reuse-message-button"
						icon="copy"
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
			>
				<template v-if="pastChatMessages.length > 0" #leftPanel>
					<div :class="$style.messagesHistory">
						<N8nButton
							title="Navigate to previous message"
							icon="chevron-up"
							type="tertiary"
							text
							size="mini"
							@click="onArrowKeyDown({ currentInputValue: '', key: 'ArrowUp' })"
						/>
						<N8nButton
							title="Navigate to next message"
							icon="chevron-down"
							type="tertiary"
							text
							size="mini"
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
	--chat--spacing: var(--spacing-xs);
	--chat--message--padding: var(--spacing-2xs);
	--chat--message--font-size: var(--font-size-xs);
	--chat--input--font-size: var(--font-size-s);
	--chat--input--placeholder--font-size: var(--font-size-xs);
	--chat--message--bot--background: transparent;
	--chat--message--user--background: var(--color-text-lighter);
	--chat--message--bot--color: var(--color-text-dark);
	--chat--message--user--color: var(--color-text-dark);
	--chat--message--bot--border: none;
	--chat--message--user--border: none;
	--chat--message--user--border: none;
	--chat--input--padding: var(--spacing-xs);
	--chat--color-typing: var(--color-text-light);
	--chat--textarea--max-height: calc(var(--panel-height) * 0.3);
	--chat--message--pre--background: var(--color-foreground-light);
	--chat--textarea--height: 2.5rem;
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color-background-light);
}

.chatHeader {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-regular);
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color-foreground-base);
	padding: var(--chat--spacing);
	background-color: var(--color-foreground-xlight);
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chatTitle {
	font-weight: var(--font-weight-medium);
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
	color: var(--color-text-light);
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
	border-radius: var(--border-radius-base);
	height: 100%;
	width: 100%;
	overflow: auto;
	padding-top: var(--spacing-l);

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
	--chat--files-spacing: var(--spacing-2xs);
	--chat--input--background: transparent;
	--chat--input--file--button--color: var(--color-button-secondary-font);
	--chat--input--file--button--color-hover: var(--color-primary);

	[data-theme='dark'] & {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}
	@media (prefers-color-scheme: dark) {
		--chat--input--text-color: var(--input-font-color, var(--color-text-dark));
	}

	padding: var(--spacing-5xs);
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
</style>
