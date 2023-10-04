<script setup lang="ts">
import Layout from '@/components/Layout.vue';
import GetStarted from '@/components/GetStarted.vue';
import GetStartedFooter from '@/components/GetStartedFooter.vue';
import MessagesList from '@/components/MessagesList.vue';
import Input from '@/components/Input.vue';
import { nextTick, onMounted } from 'vue';
import { useI18n } from '@/composables';
import { useChat } from '@/composables';
import { chatEventBus } from '@/event-buses';

const { t } = useI18n();
const chatStore = useChat();

const { messages, currentSessionId } = chatStore;

async function initialize() {
	await chatStore.loadPreviousSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

async function getStarted() {
	void chatStore.startNewSession();
	void nextTick(() => {
		chatEventBus.emit('scrollToBottom');
	});
}

onMounted(() => {
	void initialize();
});
</script>

<template>
	<Layout class="chat-wrapper">
		<template #header v-if="!currentSessionId">
			<h1>{{ t('title') }}</h1>
			<p>{{ t('subtitle') }}</p>
		</template>
		<GetStarted v-if="!currentSessionId" @click:button="getStarted" />
		<MessagesList v-else :messages="messages" />
		<template #footer>
			<Input v-if="currentSessionId" />
			<GetStartedFooter v-else />
		</template>
	</Layout>
</template>
