<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import ChatComponent from '@n8n/chat/components/Chat.vue';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import type { Ref } from 'vue';
import { computed, provide, ref } from 'vue';

const locale = useI18n();

const usersStore = useUsersStore();
const uiStore = useUIStore();

const userName = computed(() => usersStore.currentUser?.firstName ?? 'there');
const lastSelectedNode = computed(() => uiStore.getLastSelectedNode);

const chatTitle = locale.baseText('aiAssistantChat.title');
const thanksResponses = [
	locale.baseText('aiAssistantChat.response.message1'),
	locale.baseText('aiAssistantChat.response.message2'),
	'🙏',
];
const initialMessageText = computed(() => {
	if (lastSelectedNode.value) {
		return locale.baseText('aiAssistantChat.initialMessage.nextStep', {
			interpolate: { currentAction: lastSelectedNode.value.name },
		});
	}

	return locale.baseText('aiAssistantChat.initialMessage.firstStep');
});

const initialMessages: Ref<ChatMessage[]> = ref([
	{
		id: '1',
		type: 'text',
		sender: 'bot',
		createdAt: new Date().toISOString(),
		text: `${locale.baseText('aiAssistantChat.greeting', { interpolate: { username: userName.value ?? 'there' } })} ${initialMessageText.value}`,
	},
]);
const messages: Ref<ChatMessage[]> = ref([]);
const waitingForResponse = ref(false)
const currentSessionId = ref<string>(String(Date.now()));

const sendMessage = async (message: string) => {
	messages.value.push({
		id: String(messages.value.length + 1),
		sender: 'user',
		text: message,
		createdAt: new Date().toISOString(),
	});
	// Random integer between 5 and 10
	const randomDelay = Math.floor(Math.random() * 6) + 5;
	// Message response timeout will be between 500ms and a second
	const responseTimeout = randomDelay * 100;
	thanksResponses.forEach((response, index) => {
		waitingForResponse.value = true;
		// Push each response with a delay of 500ms
		setTimeout(
			() => {
				messages.value.push({
					id: String(messages.value.length + 1),
					sender: 'bot',
					text: response,
					createdAt: new Date().toISOString(),
				});
				waitingForResponse.value = false;
			},
			responseTimeout * (index + 1),
		);
	});
};

const chatOptions: ChatOptions = {
	i18n: {
		en: {
			title: chatTitle,
			footer: '',
			subtitle: '',
			inputPlaceholder: locale.baseText('aiAssistantChat.chatPlaceholder'),
			getStarted: locale.baseText('aiAssistantChat.getStarted'),
		},
	},
	webhookUrl: 'https://webhook.url',
	mode: 'window',
};

const chatConfig: Chat = {
	messages,
	sendMessage,
	initialMessages,
	currentSessionId,
	waitingForResponse,
	async loadPreviousSession(): Promise<string | undefined> {
		return '';
	},
	async startNewSession(): Promise<void> {
		// eslint-disable-next-line no-console
		console.log('Starting new session');
	},
};

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);
</script>

<template>
	<div :class="[$style.container, 'ignore-key-press']">
		<ChatComponent />
	</div>
</template>

<style module lang="scss">
.container {
	height: 100%;
	background-color: var(--color-background-light);
	box-shadow: 0px 8px 24px 0px #41424412;
	border-left: 1px solid var(--color-foreground-dark);
	overflow: hidden;
}

.header {
	font-size: var(--font-size-l);
	background-color: #fff;
	padding: var(--spacing-xs);
}

.content {
	padding: var(--spacing-xs);
}
</style>
