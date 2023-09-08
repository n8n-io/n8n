import { ref } from 'vue';
import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types';
import { localStorageSessionIdKey } from '@/constants';

const dummyMessages: ChatMessage[] = [
	{
		id: '0',
		text: 'Hello',
		sender: 'user',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
	{
		id: '1',
		text: 'Hello, how are you?',
		sender: 'bot',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
	{
		id: '2',
		text: 'I am fine, thanks',
		sender: 'user',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
	{
		id: '3',
		text: 'How are you?',
		sender: 'user',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
	{
		id: '4',
		text: "I am a bit rusty, but I'll be fine",
		sender: 'bot',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
	{
		id: '5',
		text: 'Can you tell me what this app is about?',
		sender: 'user',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
	{
		id: '6',
		text: 'This is a chatbot app powered by n8n',
		sender: 'bot',
		createdAt: '2021-08-10T12:00:00.000Z',
	},
];

export const useChatStore = defineStore('chat', () => {
	const messages = ref<ChatMessage[]>([]);
	const currentSessionId = ref<string | null>(null);

	async function sendMessage() {
		messages.value.push({
			text: 'Hello',
		});
	}

	async function loadPreviousSession() {
		const sessionId = localStorage.getItem(localStorageSessionIdKey);

		messages.value.push(...dummyMessages);

		return sessionId;
	}

	async function startNewSession() {
		currentSessionId.value = uuidv4();

		localStorage.setItem(localStorageSessionIdKey, currentSessionId.value);
	}

	return { messages, currentSessionId, loadPreviousSession, startNewSession, sendMessage };
});
