<script setup lang="ts">
import IconContentCopy from 'virtual:icons/mdi/content-copy';
import IconRestart from 'virtual:icons/mdi/restart';
import { N8nTooltip, N8nIcon } from '@n8n/design-system';

import { useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage } from '@n8n/chat/types';

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
	const messageText = typeof props.message?.text === 'string' ? props.message?.text : '';
	if (messageText.trim()) {
		chatEventBus.emit('setInputValue', messageText);
	}
}
</script>

<template>
	<div v-if="options.enableMessageActions" class="message-actions">
		<N8nTooltip v-if="message.sender === 'user'">
			<N8nIcon icon="redo-2" size="xsmall" class="icon" @click="repostMessage" />
			<template #content> Reuse message </template>
		</N8nTooltip>
		<N8nTooltip v-if="message.sender === 'user'">
			<N8nIcon icon="files" size="xsmall" class="icon" @click="copyToInput" />
			<template #content> Reuse Message </template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" scoped>
.message-actions {
	display: inline-flex;
	gap: var(--chat--message-actions--gap, 4rem);
	margin: 0 var(--chat--message-actions--gap, 4rem);
	align-items: center;
}

.icon {
	color: var(--chat--color-light);
	cursor: pointer;

	&:hover {
		color: var(--chat--color--primary);
	}
}
</style>
