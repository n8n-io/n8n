<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useUsersStore } from '@/stores/users.store';
import ChatComponent from '@n8n/chat/components/Chat.vue';
import { ChatOptionsSymbol, ChatSymbol } from '@n8n/chat/constants';
import type { Chat, ChatMessage, ChatOptions } from '@n8n/chat/types';
import type { Ref } from 'vue';
import { computed, provide, ref } from 'vue';
import QuickReplies from './QuickReplies.vue';
import { DateTime } from 'luxon';
import { useAIStore } from '@/stores/ai.store';
import { chatEventBus } from '@n8n/chat/event-buses';
import { onMounted } from 'vue';
import { AI_ASSISTANT_EXPERIMENT_URLS, AI_ASSISTANT_LOCAL_STORAGE_KEY } from '@/constants';
import { useStorage } from '@/composables/useStorage';

const locale = useI18n();

const usersStore = useUsersStore();
const aiStore = useAIStore();

const messages: Ref<ChatMessage[]> = ref([]);
const waitingForResponse = ref(false);
const currentSessionId = ref<string>(String(Date.now()));

const userName = computed(() => usersStore.currentUser?.firstName ?? 'there');
const latestConnectionInfo = computed(() => aiStore.latestConnectionInfo);

const chatTitle = locale.baseText('aiAssistantChat.title');
const thanksResponses: ChatMessage[] = [
	{
		id: String(DateTime.now().toMillis()),
		sender: 'bot',
		text: locale.baseText('aiAssistantChat.response.message1'),
		createdAt: new Date().toISOString(),
	},
	{
		id: String(DateTime.now().toMillis()),
		sender: 'bot',
		text: locale.baseText('aiAssistantChat.response.message2'),
		createdAt: new Date().toISOString(),
	},
	{
		id: String(DateTime.now().toMillis()),
		sender: 'bot',
		text: '🙏',
		createdAt: new Date().toISOString(),
	},
	{
		id: String(DateTime.now().toMillis()),
		type: 'component',
		key: 'QuickReplies',
		sender: 'user',
		createdAt: new Date().toISOString(),
		transparent: true,
		arguments: {
			suggestions: [
				{ label: locale.baseText('aiAssistantChat.response.quickReply.close'), key: 'close' },
				{
					label: locale.baseText('aiAssistantChat.response.quickReply.giveFeedback'),
					key: 'give_feedback',
				},
				{
					label: locale.baseText('aiAssistantChat.response.quickReply.signUp'),
					key: 'sign_up',
				},
			],
			onReplySelected: ({ key }: { key: string; label: string }) => {
				switch (key) {
					case 'give_feedback':
						window.open(AI_ASSISTANT_EXPERIMENT_URLS.FEEDBACK_FORM, '_blank');
						break;
					case 'sign_up':
						window.open(AI_ASSISTANT_EXPERIMENT_URLS.SIGN_UP, '_blank');
						break;
				}
				aiStore.assistantChatOpen = false;
			},
		},
	},
];

const initialMessageText = computed(() => {
	if (latestConnectionInfo.value) {
		return locale.baseText('aiAssistantChat.initialMessage.nextStep', {
			interpolate: { currentAction: latestConnectionInfo.value.stepName },
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
				messages.value.push(response);
				waitingForResponse.value = false;
				chatEventBus.emit('scrollToBottom');
			},
			responseTimeout * (index + 1),
		);
	});
	chatEventBus.emit('scrollToBottom');
};

const chatOptions: ChatOptions = {
	i18n: {
		en: {
			title: chatTitle,
			footer: '',
			subtitle: '',
			inputPlaceholder: locale.baseText('aiAssistantChat.chatPlaceholder'),
			getStarted: locale.baseText('aiAssistantChat.getStarted'),
			closeButtonTooltip: locale.baseText('aiAssistantChat.closeButtonTooltip'),
		},
	},
	webhookUrl: 'https://webhook.url',
	mode: 'window',
	showWindowCloseButton: true,
	messageComponents: {
		QuickReplies,
	},
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

onMounted(() => {
	chatEventBus.emit('focusInput');
	chatEventBus.on('close', () => {
		aiStore.assistantChatOpen = false;
	});
	useStorage(AI_ASSISTANT_LOCAL_STORAGE_KEY).value = 'true';
});
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
