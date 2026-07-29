<script lang="ts" setup>
import { N8nIcon, N8nText } from '@n8n/design-system';
import { ref, watch } from 'vue';

import Message from '@n8n/chat/components/Message.vue';
import MessageTyping from '@n8n/chat/components/MessageTyping.vue';
import { useChat } from '@n8n/chat/composables';
import type { ChatMessage } from '@n8n/chat/types';

defineProps<{
	messages: ChatMessage[];
	emptyText?: string;
}>();

defineSlots<{
	beforeMessage(props: { message: ChatMessage }): ChatMessage;
}>();

const chatStore = useChat();
const messageComponents = ref<Array<InstanceType<typeof Message>>>([]);
const { initialMessages, waitingForResponse } = chatStore;

watch(
	() => messageComponents.value.length,
	() => {
		const lastMessageComponent = messageComponents.value[messageComponents.value.length - 1];
		if (lastMessageComponent) {
			lastMessageComponent.scrollToView();
		}
	},
);
</script>
<template>
	<div
		v-if="emptyText && initialMessages.length === 0 && messages.length === 0"
		class="empty-container"
	>
		<div class="empty" data-test-id="chat-messages-empty">
			<N8nIcon icon="message-circle" size="large" class="emptyIcon" />
			<N8nText tag="p" size="medium" color="text-base">
				{{ emptyText }}
			</N8nText>
		</div>
	</div>

	<div v-else class="chat-messages-list">
		<Message
			v-for="initialMessage in initialMessages"
			:key="initialMessage.id"
			:message="initialMessage"
		/>

		<template v-for="message in messages" :key="message.id">
			<Message ref="messageComponents" :message="message">
				<template #beforeMessage="{ message }">
					<slot name="beforeMessage" v-bind="{ message }" />
				</template>
			</Message>
		</template>
		<MessageTyping v-if="waitingForResponse" />
	</div>
</template>

<style lang="scss">
.chat-messages-list {
	margin-top: auto;
	display: block;
	padding: var(--chat--messages-list--padding);
}

.empty-container {
	container-type: size;
	display: flex;
	align-items: center;
	justify-content: center;

	p {
		max-width: 16em;
		margin: 0;
	}
}

.empty {
	text-align: center;
	color: var(--color--text);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding-inline: var(--spacing--md);
	padding-bottom: var(--spacing--lg);
	overflow: hidden;
}

.emptyIcon {
	zoom: 2.5;
	color: var(--color-button-secondary-border);
}

@container (height < 150px) {
	.empty {
		flex-direction: row;
		text-align: left;
	}

	.emptyIcon {
		zoom: 1.5;
	}
}
</style>
