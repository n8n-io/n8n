<script setup lang="ts">
import { N8nTooltip, N8nIcon } from '@n8n/design-system';

import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage } from '@n8n/chat/types';

const props = defineProps<{
	message: ChatMessage;
}>();

const { options } = useOptions();
const chatStore = useChat();
const { t } = useI18n();

async function repostMessage() {
	if (props.message.sender === 'user') {
		// Repost user message by sending it again
		const messageText =
			'text' in props.message && typeof props.message.text === 'string' ? props.message.text : '';
		if (messageText.trim()) {
			await chatStore.sendMessage(
				messageText,
				props.message.files ? Array.from(props.message.files) : [],
			);
		}
	}
}

function copyToInput() {
	const messageText =
		'text' in props.message && typeof props.message?.text === 'string' ? props.message?.text : '';
	if (messageText.trim()) {
		chatEventBus.emit('setInputValue', messageText);
	}
}
</script>

<template>
	<div v-if="options.enableMessageActions" class="message-actions">
		<N8nTooltip v-if="message.sender === 'user'">
			<N8nIcon icon="redo-2" size="medium" class="icon" @click="repostMessage" />
			<template #content>{{ t('repostButton') }}</template>
		</N8nTooltip>
		<N8nTooltip v-if="message.sender === 'user'">
			<N8nIcon icon="files" size="medium" class="icon" @click="copyToInput" />
			<template #content>{{ t('reuseButton') }}</template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" scoped>
.message-actions {
	display: inline-flex;
	gap: var(--chat--message--actions--gap);
	margin: 0 var(--chat--message--actions--gap);
	align-items: center;
}

.icon {
	color: var(--chat--message--actions--color);
	cursor: pointer;

	&:hover {
		color: var(--chat--message--actions--hover);
	}
}
</style>
