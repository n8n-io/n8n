<script setup lang="ts">
import Close from 'virtual:icons/mdi/close';
import { computed, nextTick, onMounted, ref } from 'vue';

import GetStarted from '@n8n/chat/components/GetStarted.vue';
import GetStartedFooter from '@n8n/chat/components/GetStartedFooter.vue';
import Input from '@n8n/chat/components/Input.vue';
import Layout from '@n8n/chat/components/Layout.vue';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ArrowKeyDownPayload } from '@n8n/chat/components/Input.vue';

const { t } = useI18n();
const chatStore = useChat();

const { messages, currentSessionId } = chatStore;
const { options } = useOptions();

const showCloseButton = computed(() => options.mode === 'window' && options.showWindowCloseButton);

// Message history navigation
const messageHistoryIndex = ref(-1);
const userMessages = computed(() =>
	messages.value
		.filter((m) => m.sender === 'user')
		.map((m) => (typeof m.text === 'string' ? m.text : '')),
);

async function getStarted() {
	if (!chatStore.startNewSession) {
		return;
	}
	void chatStore.startNewSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

async function initialize() {
	if (!chatStore.loadPreviousSession) {
		return;
	}
	await chatStore.loadPreviousSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

function closeChat() {
	chatEventBus.emit('close');
}

function onArrowKeyDown(payload: ArrowKeyDownPayload) {
	console.log('Chat received arrow key:', payload); // Debug
	const userMessagesList = userMessages.value;

	if (userMessagesList.length === 0) {
		console.log('No user messages available for navigation'); // Debug
		return;
	}

	if (payload.key === 'ArrowUp') {
		// Navigate to previous message
		if (messageHistoryIndex.value < userMessagesList.length - 1) {
			messageHistoryIndex.value++;
			const messageText = userMessagesList[userMessagesList.length - 1 - messageHistoryIndex.value];
			console.log('Setting input to:', messageText); // Debug
			chatEventBus.emit('setInputValue', messageText);
		}
	} else if (payload.key === 'ArrowDown') {
		// Navigate to next message or clear input
		if (messageHistoryIndex.value > 0) {
			messageHistoryIndex.value--;
			const messageText = userMessagesList[userMessagesList.length - 1 - messageHistoryIndex.value];
			console.log('Setting input to:', messageText); // Debug
			chatEventBus.emit('setInputValue', messageText);
		} else if (messageHistoryIndex.value === 0) {
			messageHistoryIndex.value = -1;
			console.log('Clearing input'); // Debug
			chatEventBus.emit('setInputValue', '');
		}
	}
}

onMounted(async () => {
	await initialize();
	if (!options.showWelcomeScreen && !currentSessionId.value) {
		await getStarted();
	}

	// Reset history index when a new message is sent
	chatEventBus.on('messageSent', () => {
		messageHistoryIndex.value = -1;
	});
});
</script>

<template>
	<Layout class="chat-wrapper">
		<template #header>
			<div class="chat-heading">
				<h1>
					{{ t('title') }}
				</h1>
				<button
					v-if="showCloseButton"
					class="chat-close-button"
					:title="t('closeButtonTooltip')"
					@click="closeChat"
				>
					<Close height="18" width="18" />
				</button>
			</div>
			<p v-if="t('subtitle')">{{ t('subtitle') }}</p>
		</template>
		<GetStarted v-if="!currentSessionId && options.showWelcomeScreen" @click:button="getStarted" />
		<MessagesList v-else :messages="messages" />
		<template #footer>
			<Input v-if="currentSessionId" @arrow-key-down="onArrowKeyDown" />
			<GetStartedFooter v-else />
		</template>
	</Layout>
</template>

<style lang="scss">
.chat-heading {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chat-close-button {
	display: flex;
	border: none;
	background: none;
	cursor: pointer;

	&:hover {
		color: var(--chat--close--button--color-hover, var(--chat--color--primary));
	}
}
</style>
