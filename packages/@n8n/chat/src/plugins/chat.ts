import type { Plugin } from 'vue';
import { computed, nextTick, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, ChatOptions } from '@n8n/chat/types';
import { chatEventBus } from '@n8n/chat/event-buses';
import * as api from '@n8n/chat/api';
import { ChatOptionsSymbol, ChatSymbol, localStorageSessionIdKey } from '@n8n/chat/constants';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ChatPlugin: Plugin<ChatOptions> = {
	install(app, options) {
		app.provide(ChatOptionsSymbol, options);

		const messages = ref<ChatMessage[]>([]);
		const currentSessionId = ref<string | null>(null);
		const waitingForResponse = ref(false);

		const initialMessages = computed<ChatMessage[]>(() =>
			(options.initialMessages ?? []).map((text) => ({
				id: uuidv4(),
				text,
				sender: 'bot',
				createdAt: new Date().toISOString(),
			})),
		);

		async function sendMessage(text: string) {
			const sentMessage: ChatMessage = {
				id: uuidv4(),
				text,
				sender: 'user',
				createdAt: new Date().toISOString(),
			};

			messages.value.push(sentMessage);
			waitingForResponse.value = true;

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});

			const sendMessageResponse = await api.sendMessage(
				text,
				currentSessionId.value as string,
				options,
			);

			const receivedMessage: ChatMessage = {
				id: uuidv4(),
				text: sendMessageResponse.output,
				sender: 'bot',
				createdAt: new Date().toISOString(),
			};
			messages.value.push(receivedMessage);

			waitingForResponse.value = false;

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});
		}

		async function loadPreviousSession() {
			if (!options.loadPreviousSession) {
				return;
			}

			const sessionId = localStorage.getItem(localStorageSessionIdKey) ?? uuidv4();
			const previousMessagesResponse = await api.loadPreviousSession(sessionId, options);
			const timestamp = new Date().toISOString();

			messages.value = (previousMessagesResponse?.data || []).map((message, index) => ({
				id: `${index}`,
				text: message.kwargs.content,
				sender: message.id.includes('HumanMessage') ? 'user' : 'bot',
				createdAt: timestamp,
			}));

			if (messages.value.length) {
				currentSessionId.value = sessionId;
			}

			return sessionId;
		}

		async function startNewSession() {
			currentSessionId.value = uuidv4();

			localStorage.setItem(localStorageSessionIdKey, currentSessionId.value);
		}

		const chatStore = {
			initialMessages,
			messages,
			currentSessionId,
			waitingForResponse,
			loadPreviousSession,
			startNewSession,
			sendMessage,
		};

		app.provide(ChatSymbol, chatStore);
		app.config.globalProperties.$chat = chatStore;
	},
};
