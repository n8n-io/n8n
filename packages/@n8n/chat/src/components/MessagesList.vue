<script lang="ts" setup>
import type { PropType } from 'vue';
import Message from '@n8n/chat/components/Message.vue';
import type { ChatMessage } from '@n8n/chat/types';
import MessageTyping from '@n8n/chat/components/MessageTyping.vue';
import { useChat } from '@n8n/chat/composables';

defineProps({
	messages: {
		type: Array as PropType<ChatMessage[]>,
		required: true,
	},
});

const chatStore = useChat();

const { initialMessages, waitingForResponse } = chatStore;
</script>
<template>
	<div class="chat-messages-list">
		<Message
			v-for="initialMessage in initialMessages"
			:key="initialMessage.id"
			:message="initialMessage"
		/>
		<Message v-for="message in messages" :key="message.id" :message="message" />
		<MessageTyping v-if="waitingForResponse" />
	</div>
</template>

<style lang="scss">
.chat-messages-list {
	margin-top: auto;
	display: block;
	padding: var(--chat--messages-list--padding, var(--chat--spacing));
}
</style>
