<script lang="ts" setup>
import { ref, watch } from 'vue';

import Message from '@n8n/chat/components/Message.vue';
import MessageTyping from '@n8n/chat/components/MessageTyping.vue';
import { useChat } from '@n8n/chat/composables';
import type { ChatMessage } from '@n8n/chat/types';
import StreamingOutput from './StreamingOutput.vue';

defineProps<{
	messages: ChatMessage[];
	emptyText?: string;
	executedNodes?: string[];
	executingOutput?: string;
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
			<N8nIcon icon="comment" size="large" class="emptyIcon" />
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
		<!-- <span class="executed-output">{{ executingOutput }}</span> -->
		<div
			v-if="waitingForResponse && executedNodes && executedNodes.length > 0"
			class="executed-nodes"
		>
			<StreamingOutput
				v-if="executingOutput && executingOutput.length >= 1"
				:message="executingOutput"
			/>
			<div class="executed-nodes-list">
				<span v-for="nodeName in executedNodes" :key="nodeName" class="executed-node">
					{{ nodeName }}
				</span>
			</div>
		</div>
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
	color: var(--color-text-base);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-xs);
	padding-inline: var(--spacing-m);
	padding-bottom: var(--spacing-l);
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

.executed-nodes {
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
}

.executed-nodes-list {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-2xs);
}

.executed-node {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	padding: var(--spacing-4xs) var(--spacing-2xs);
	background: var(--color-primary-tint-3);
	border-radius: var(--border-radius-small);
	border: 1px solid var(--color-primary-tint-2);
	white-space: nowrap;
	font-weight: var(--font-weight-medium);
}
</style>
