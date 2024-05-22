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
import {
	AI_ASSISTANT_EXPERIMENT_URLS,
	AI_ASSISTANT_LOCAL_STORAGE_KEY,
	MODAL_CONFIRM,
} from '@/constants';
import { useStorage } from '@/composables/useStorage';
import { useMessage } from '@/composables/useMessage';
import { useTelemetry } from '@/composables/useTelemetry';
import { onBeforeUnmount } from 'vue';

const locale = useI18n();
const telemetry = useTelemetry();
const { confirm } = useMessage();

const usersStore = useUsersStore();
const aiStore = useAIStore();

const messages: Ref<ChatMessage[]> = ref([]);
const waitingForResponse = ref(false);
const currentSessionId = ref<string>(String(Date.now()));
const disableChat = ref(false);

const userName = computed(() => usersStore.currentUser?.firstName ?? 'there');
const latestConnectionInfo = computed(() => aiStore.latestConnectionInfo);

const chatTitle = locale.baseText('aiAssistantChat.title');
const nowMilliseconds = () => String(DateTime.now().toMillis());
const nowIsoString = () => new Date().toISOString();
const thanksResponses: ChatMessage[] = [
	{
		id: nowMilliseconds(),
		sender: 'bot',
		text: locale.baseText('aiAssistantChat.response.message1'),
		createdAt: nowIsoString(),
	},
	{
		id: nowMilliseconds(),
		sender: 'bot',
		text: locale.baseText('aiAssistantChat.response.message2'),
		createdAt: nowIsoString(),
	},
	{
		id: nowMilliseconds(),
		sender: 'bot',
		text: '🙏',
		createdAt: new Date().toISOString(),
	},
	{
		id: nowMilliseconds(),
		type: 'component',
		key: 'QuickReplies',
		sender: 'user',
		createdAt: nowIsoString(),
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
	disableChat.value = true;
	waitingForResponse.value = true;
	messages.value.push({
		id: String(messages.value.length + 1),
		sender: 'user',
		text: message,
		createdAt: new Date().toISOString(),
	});
	trackUserMessage(message);
	thanksResponses.forEach((response, index) => {
		// Push each response with a delay of 1500ms
		setTimeout(
			() => {
				messages.value.push(response);
				chatEventBus.emit('scrollToBottom');
				if (index === thanksResponses.length - 1) {
					waitingForResponse.value = false;
					// Once last message is sent, disable the experiment
					useStorage(AI_ASSISTANT_LOCAL_STORAGE_KEY).value = 'true';
				}
			},
			1500 * (index + 1),
		);
	});
	chatEventBus.emit('scrollToBottom');
};

const trackUserMessage = (message: string) => {
	telemetry.track('User responded in AI chat', {
		prompt: message,
		chatMode: 'nextStepAssistant',
		initialMessage: initialMessageText.value,
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
			closeButtonTooltip: locale.baseText('aiAssistantChat.closeButtonTooltip'),
		},
	},
	webhookUrl: 'https://webhook.url',
	mode: 'window',
	showWindowCloseButton: true,
	messageComponents: {
		QuickReplies,
	},
	disabled: disableChat,
};

const chatConfig: Chat = {
	messages,
	sendMessage,
	initialMessages,
	currentSessionId,
	waitingForResponse,
};

provide(ChatSymbol, chatConfig);
provide(ChatOptionsSymbol, chatOptions);

onMounted(() => {
	chatEventBus.emit('focusInput');
	chatEventBus.on('close', onBeforeClose);
});

onBeforeUnmount(() => {
	chatEventBus.off('close', onBeforeClose);
});

async function onBeforeClose() {
	const confirmModal = await confirm(locale.baseText('aiAssistantChat.closeChatConfirmation'), {
		confirmButtonText: locale.baseText('aiAssistantChat.closeChatConfirmation.confirm'),
		cancelButtonText: locale.baseText('aiAssistantChat.closeChatConfirmation.cancel'),
	});

	if (confirmModal === MODAL_CONFIRM) {
		aiStore.assistantChatOpen = false;
	}
}
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
	filter: drop-shadow(0px 8px 24px #41424412);
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
