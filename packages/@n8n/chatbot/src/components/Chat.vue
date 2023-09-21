<script setup lang="ts">
import { Layout, MessagesList, GetStarted, GetStartedFooter, Input } from '@/components';
import { computed, nextTick, onMounted, ref, toRefs } from 'vue';
import { useI18n, useOptions } from '@/composables';
import { useChatStore } from '@/stores/chat';
import { chatEventBus } from '@/event-buses';

const { options } = useOptions();
const { t, te } = useI18n();
const chatStore = useChatStore();

const { messages, currentSessionId } = toRefs(chatStore);

const footerVisible = computed<boolean>(() => {
	return !!options.poweredBy || te('footer') || !!currentSessionId.value;
});

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
		<template v-if="footerVisible" #footer>
			<Input v-if="currentSessionId" />
			<GetStartedFooter v-else />
		</template>
	</Layout>
</template>
