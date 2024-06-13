<script lang="ts" setup>
import { ref, watch, type PropType } from 'vue';
import Message from '@n8n/chat/components/Message.vue';
import type { ChatMessage } from '@n8n/chat/types';
import MessageTyping from '@n8n/chat/components/MessageTyping.vue';
import { useChat } from '@n8n/chat/composables';

const props = defineProps({
	messages: {
		type: Array as PropType<ChatMessage[]>,
		required: true,
	},
});

const chatStore = useChat();
const messageComponents = ref<Array<InstanceType<typeof Message>>>([]);
const { initialMessages, waitingForResponse } = chatStore;

watch(
	() => messageComponents.value.length,
	() => {
		const lastMessageComponent = messageComponents.value[messageComponents.value.length - 1];
		if (lastMessageComponent) {
			// lastMessageComponent.messageContainer;
			console.log(
				'🚀 ~ watch ~ lastMessageComponent.messageContainer:',
				lastMessageComponent.scrollToView(),
			);
		}
		// if (messageComponent.value) {
		// 	// messageComponent.value.scrollToBottom();
		// }
	},
);
</script>
<template>
	<div class="chat-messages-list">
		<Message
			v-for="initialMessage in initialMessages"
			:key="initialMessage.id"
			:message="initialMessage"
		/>
		<Message
			v-for="message in messages"
			:key="message.id"
			ref="messageComponents"
			:message="message"
		/>
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
