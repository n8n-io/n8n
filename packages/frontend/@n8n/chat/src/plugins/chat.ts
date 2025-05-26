import { v4 as uuidv4 } from 'uuid';
import type { Plugin } from 'vue';
import { computed, nextTick, ref } from 'vue';

import * as api from '@n8n/chat/api';
import { ChatOptionsSymbol, ChatSymbol, localStorageSessionIdKey } from '@n8n/chat/constants';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage, ChatOptions } from '@n8n/chat/types';

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
			})),
		);

		async function sendMessage(text: string, files: File[] = []) {
			const sentMessage: ChatMessage = {
				id: uuidv4(),
				text,
				sender: 'user',
				files,
			};

			messages.value.push(sentMessage);
			waitingForResponse.value = true;

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
			});

						// Create a placeholder message for streaming - will be added when first chunk arrives
			let receivedMessage: ChatMessage | null = null;

			try {
				if(options?.enableStreaming) {
					// Use streaming API
					await api.sendMessageStreaming(
						text,
						files,
						currentSessionId.value as string,
						options,
						(chunk: string) => {
							// Create the message on first chunk to avoid showing "Empty Response"
							if(receivedMessage){
								messages.value.splice(messages.value.length - 1, 1);
							}
							receivedMessage = {
								id: uuidv4(),
								type: 'text',
								text: receivedMessage?.text ?? '',
								sender: 'bot',
							};

							// Update the message text with the new chunk
							console.log('Adding chunk', chunk);
							if (receivedMessage && 'text' in receivedMessage) {
								receivedMessage.text += chunk;
							}

							messages.value.push(receivedMessage);
							console.log('Received message', receivedMessage);

							// Force Vue reactivity update
							void nextTick(() => {
								chatEventBus.emit('scrollToBottom');
							});
						},
					);
				} else {
					receivedMessage = {
						id: uuidv4(),
						type: 'text',
						text: '',
						sender: 'bot',
					};
					// Use regular API
					const sendMessageResponse = await api.sendMessage(
						text,
						files,
						currentSessionId.value as string,
						options,
					);

					let textMessage = sendMessageResponse.output ?? sendMessageResponse.text ?? '';

					if (textMessage === '' && Object.keys(sendMessageResponse).length > 0) {
						try {
							textMessage = JSON.stringify(sendMessageResponse, null, 2);
						} catch (e) {
							// Failed to stringify the object so fallback to empty string
						}
					}

					receivedMessage.text = textMessage;
					messages.value.push(receivedMessage);
				}
			} catch (error) {
				// If streaming or regular API fails, show error message
				if (!receivedMessage) {
					receivedMessage = {
						id: uuidv4(),
						type: 'text',
						text: '',
						sender: 'bot',
					};
					messages.value.push(receivedMessage);
				}
				if (receivedMessage && 'text' in receivedMessage) {
					receivedMessage.text = 'Error: Failed to receive response';
				}
				console.error('Chat API error:', error);
			} finally {
				// Always set waiting to false when done, regardless of success or failure
				waitingForResponse.value = false;
			}

			void nextTick(() => {
				chatEventBus.emit('scrollToBottom');
				console.log(messages.value);
			});
		}

		async function loadPreviousSession() {
			if (!options.loadPreviousSession) {
				return;
			}

			const sessionId = localStorage.getItem(localStorageSessionIdKey) ?? uuidv4();
			const previousMessagesResponse = await api.loadPreviousSession(sessionId, options);

			messages.value = (previousMessagesResponse?.data || []).map((message, index) => ({
				id: `${index}`,
				text: message.kwargs.content,
				sender: message.id.includes('HumanMessage') ? 'user' : 'bot',
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
