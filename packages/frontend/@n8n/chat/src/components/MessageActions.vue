<script setup lang="ts">
import IconRestart from 'virtual:icons/mdi/restart';
import IconContentCopy from 'virtual:icons/mdi/content-copy';

import { useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';

const props = defineProps<{
	message: ChatMessage;
}>();

const { options } = useOptions();
const chatStore = useChat();

async function repostMessage() {
	if (props.message.sender === 'user') {
		// Repost user message by sending it again
		const messageText = typeof props.message.text === 'string' ? props.message.text : '';
		if (messageText.trim()) {
			await chatStore.sendMessage(
				messageText,
				props.message.files ? Array.from(props.message.files) : [],
			);
		}
	}
}

function copyToInput() {
	const messageText = typeof props.message.text === 'string' ? props.message.text : '';
	if (messageText.trim()) {
		chatEventBus.emit('setInputValue', messageText);
	}
}
</script>

<template>
	<div v-if="options.enableMessageActions" class="message-actions">
		<button
			v-if="message.sender === 'user'"
			class="message-action-button"
			title="Repost message"
			@click="repostMessage"
		>
			<IconRestart height="16" width="16" />
		</button>
		<button class="message-action-button" title="Copy to input" @click="copyToInput">
			<IconContentCopy height="16" width="16" />
		</button>
	</div>
</template>

<style lang="scss" scoped>
.message-actions {
	display: flex;
	gap: var(--chat--message-actions--gap, 8px);
	align-items: center;
}

.message-action-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--chat--message-actions--button-size, 28px);
	height: var(--chat--message-actions--button-size, 28px);
	border: var(--chat--message-actions--button-border, none);
	border-radius: var(--chat--message-actions--button-border-radius, 6px);
	background: var(--chat--message-actions--button-background, transparent);
	cursor: pointer;
	transition: var(--chat--message-actions--button-transition, all 0.15s ease);
	color: var(--chat--message-actions--button-color, rgba(255, 255, 255, 0.7));
	box-shadow: var(--chat--message-actions--button-shadow, none);

	&:hover {
		background: var(--chat--message-actions--button-hover-background, rgba(255, 255, 255, 0.1));
		color: var(--chat--message-actions--button-hover-color, rgba(255, 255, 255, 1));
		transform: var(--chat--message-actions--button-hover-transform, scale(1.1));
	}

	&:active {
		transform: var(--chat--message-actions--button-active-transform, scale(0.95));
		background: var(--chat--message-actions--button-active-background, rgba(255, 255, 255, 0.2));
	}

	svg {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
	}
}
</style>
