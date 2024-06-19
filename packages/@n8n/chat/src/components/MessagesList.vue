<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import Message from '@n8n/chat/components/Message.vue';
import type { ChatMessage } from '@n8n/chat/types';
import MessageTyping from '@n8n/chat/components/MessageTyping.vue';
import { useChat, useOptions } from '@n8n/chat/composables';

defineProps<{
	messages: ChatMessage[];
}>();

defineSlots<{
	beforeMessage(props: { message: ChatMessage }): ChatMessage;
}>();

const chatStore = useChat();
const { options } = useOptions();
const messageComponents = ref<Array<InstanceType<typeof Message>>>([]);
const { initialMessages, waitingForResponse } = chatStore;
const messageActions = computed(() => options.messageActions ?? []);
watch(
	() => messageComponents.value.length,
	() => {
		const lastMessageComponent = messageComponents.value[messageComponents.value.length - 1];
		if (lastMessageComponent) {
			lastMessageComponent.scrollToView();
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

		<template v-for="message in messages" :key="message.id">
			<Message ref="messageComponents" :message="message" />
		</template>
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
