<script setup lang="ts">
import { nextTick, onMounted } from 'vue';
import Layout from '@n8n/chat/components/Layout.vue';
import GetStarted from '@n8n/chat/components/GetStarted.vue';
import GetStartedFooter from '@n8n/chat/components/GetStartedFooter.vue';
import MessagesList from '@n8n/chat/components/MessagesList.vue';
import Input from '@n8n/chat/components/Input.vue';
import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';

const { t } = useI18n();
const chatStore = useChat();

const { messages, currentSessionId } = chatStore;
const { options } = useOptions();

async function getStarted() {
	void chatStore.startNewSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

async function initialize() {
	await chatStore.loadPreviousSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

onMounted(async () => {
	await initialize();
	if (!options.showWelcomeScreen && !currentSessionId.value) {
		await getStarted();
	}
});
</script>

<template>
	<Layout class="chat-wrapper">
		<template #header>
			<h1>{{ t('title') }}</h1>
			<p>{{ t('subtitle') }}</p>
		</template>
		<GetStarted v-if="!currentSessionId && options.showWelcomeScreen" @click:button="getStarted" />
		<MessagesList v-else :messages="messages" />
		<template #footer>
			<Input v-if="currentSessionId" />
			<GetStartedFooter v-else />
		</template>
	</Layout>
</template>
