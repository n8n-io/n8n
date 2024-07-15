import { chatWithAssistant } from '@/api/assistant';
import { STORES } from '@/constants';
import type { ChatRequest, ChatUI } from '@/types/assistant.types';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from './root.store';
import { useUsersStore } from './users.store';

const MAX_CHAT_WIDTH = 425;
const MIN_CHAT_WIDTH = 250;

export const useAssistantStore = defineStore(STORES.ASSISTANT, () => {
	const chatEnabled = ref<boolean>(true); // todo
	const chatWidth = ref<number>(275);

	const rootStore = useRootStore();
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const usersStore = useUsersStore();

	const chatSessionError = ref<ChatRequest.ErrorContext | undefined>();

	function closeChat() {
		chatWindowOpen.value = false;
	}

	function openChat() {
		chatWindowOpen.value = true;
	}

	function addTextMessage({
		role,
		content,
		title,
		quickReplies,
	}: Pick<ChatUI.TextMessage, 'role' | 'content' | 'title' | 'quickReplies'>) {
		chatMessages.value.push({
			type: 'text',
			role,
			content,
			title,
			quickReplies,
		});
	}

	// function addCodeDiffMessage({
	// 	codeDiff,
	// 	description,
	// 	quickReplies,
	// }: Pick<ChatUI.CodeDiffMessage, 'codeDiff' | 'description' | 'quickReplies'>) {
	// 	chatMessages.value.push({
	// 		role: 'assistant',
	// 		type: 'code-diff',
	// 		description,
	// 		codeDiff,
	// 		quickReplies,
	// 	});
	// }

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	function isNodeErrorActive(error: ChatRequest.ErrorContext['error']) {
		const targetNode = error.node.name;
		const errorMessage = error.message;

		return (
			targetNode === chatSessionError.value?.error.node.name &&
			errorMessage === chatSessionError.value?.error.message
		);
	}

	async function initErrorHelper(context: ChatRequest.ErrorContext) {
		if (isNodeErrorActive(context.error)) {
			return;
		}
		chatSessionError.value = context;

		openChat();

		await chatWithAssistant(rootStore.restApiContext, {
			type: 'init-error-help',
			user: {
				firstName: usersStore.currentUser?.firstName || '',
			},
			error: context.error,
			// executionSchema todo
		});
	}

	// async function sendEvent(eventName: ChatRequest.InteractionEventName) {
	// 	await chatWithAssistant(rootStore.restApiContext, {
	// 		type: 'event',
	// 		event: eventName,
	// 	});
	// }

	async function sendMessage(
		message: Pick<ChatRequest.UserChatMessage, 'content' | 'quickReplyType'>,
	) {
		addTextMessage({ content: message.content, role: 'user' });

		await chatWithAssistant(rootStore.restApiContext, {
			type: 'user-message',
			content: message.content,
			quickReplyType: message.quickReplyType,
		});
	}

	return {
		chatEnabled,
		chatWidth,
		chatMessages,
		chatWindowOpen,
		closeChat,
		openChat,
		updateWindowWidth,
		isNodeErrorActive,
		initErrorHelper,
		sendMessage,
	};
});
