<template>
	<div :class="[$style.container, 'ignore-key-press']">
		<ChatWindow />
	</div>
</template>

<script setup lang="ts">
import ChatWindow from '@n8n/chat/components/ChatWindow.vue';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import type { Chat, ChatOptions } from '@n8n/chat/types';
import { provide, ref, useCssModule, computed } from 'vue';
import type { AddedNodesAndConnections } from '@/Interface';
import MessageWithActions from './MessageWithActions.vue';
import QuickReplies from './QuickReplies.vue';
import { useAIStore } from '@/stores/ai.store';
import MessageWithSuggestions from './MessageWithSuggestions.vue';

const emit = defineEmits<{
	(event: 'addNodes', value: AddedNodesAndConnections): void;
}>();
const $style = useCssModule();
const aiStore = useAIStore();

const messages = computed(() => aiStore.messages);
const initialMessages = computed(() => aiStore.initialMessages);
const waitingForResponse = computed(() => aiStore.waitingForResponse);
const chatTitle = computed(() => aiStore.chatTitle);

const currentSessionId = ref<string>('Whatever');
// const nodeTypesStore = useNodeTypesStore();
const chatOptions: ChatOptions = {
	i18n: {
		en: {
			title: chatTitle,
			footer: '',
			subtitle: '',
			getStarted: 'Ask and you shall receive',
			inputPlaceholder: 'Please do x',
		},
	},
	webhookUrl: 'https://webhook.url',
	mode: 'window',
	messageComponents: {
		MessageWithActions,
		QuickReplies,
		MessageWithSuggestions,
	},
};

const chatConfig: Chat = {
	messages,
	sendMessage: aiStore.sendMessage,
	initialMessages,
	currentSessionId,
	waitingForResponse,
	async loadPreviousSession(): Promise<string | undefined> {
		return 'Whatever';
	},
	async startNewSession(): Promise<void> {
		console.log('Starting new session');
	},
};

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);
</script>

<style module lang="scss">
.container {
	--chat--window--width: 700px;
}

.nodesContainer {
	display: flex;
	gap: 15px;
	z-index: 1111;
}
</style>
