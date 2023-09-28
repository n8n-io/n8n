<script lang="ts" setup>
import type { PropType } from 'vue';
import Message from '@/components/Message.vue';
import type { ChatMessage } from '@/types';
import MessageTyping from '@/components/MessageTyping.vue';
import { useChatStore } from '@/stores/chat';
import { storeToRefs } from 'pinia';

defineProps({
	messages: {
		type: Array as PropType<ChatMessage[]>,
		required: true,
	},
});

const chatStore = useChatStore();

const { initialMessages, waitingForResponse } = storeToRefs(chatStore);
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
