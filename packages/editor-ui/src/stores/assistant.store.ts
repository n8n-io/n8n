import { chatWithAssistant, replaceCode } from '@/api/assistant';
import { VIEWS } from '@/constants';
import { EDITABLE_CANVAS_VIEWS, STORES } from '@/constants';
import type { ChatRequest, ChatUI } from '@/types/assistant.types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from './root.store';
import { useUsersStore } from './users.store';
import { useRoute } from 'vue-router';

const MAX_CHAT_WIDTH = 425;
const MIN_CHAT_WIDTH = 250;
const ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS, VIEWS.EXECUTION_PREVIEW];

export const useAssistantStore = defineStore(STORES.ASSISTANT, () => {
	const chatEnabled = ref<boolean>(true); // todo
	const chatWidth = ref<number>(275);

	const rootStore = useRootStore();
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const usersStore = useUsersStore();
	const route = useRoute();

	const chatSessionError = ref<ChatRequest.ErrorContext | undefined>();
	const currentSessionId = ref<string | undefined>();

	const canShowAssistant = computed(
		() => chatEnabled.value && route.name && ENABLED_VIEWS.includes(route.name as VIEWS),
	);

	const canShowAssistantFloatingButton = computed(
		() =>
			chatEnabled.value &&
			route.name &&
			EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS) &&
			!chatWindowOpen.value,
	);

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

	function addAssistantMessage(assistantMessage: ChatRequest.MessageResponse) {
		if (assistantMessage.type === 'assistant-message') {
			addTextMessage({
				role: 'assistant',
				content: assistantMessage.content,
				title: assistantMessage.title,
			});
		} else if (assistantMessage.type === 'code-diff') {
			chatMessages.value.push({
				role: 'assistant',
				type: 'code-diff',
				description: assistantMessage.description,
				codeDiff: assistantMessage.codeDiff,
				suggestionId: assistantMessage.suggestionId,
			});
		}
		// todo
		// quickReplies: assistantMessage.quickReplies,
	}

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

		try {
			const response = await chatWithAssistant(rootStore.restApiContext, {
				type: 'init-error-help',
				user: {
					firstName: usersStore.currentUser?.firstName || '',
				},
				error: context.error,
				// executionSchema todo
			});
			currentSessionId.value = response.sessionId;
			response.messages.forEach(addAssistantMessage);
		} catch (e) {
			// todo
		}
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

		try {
			await chatWithAssistant(rootStore.restApiContext, {
				type: 'user-message',
				content: message.content,
				quickReplyType: message.quickReplyType,
			});
		} catch (e) {
			// todo
		}
	}

	async function applyCodeDiff(index: number) {
		const codeDiffMessage = chatMessages.value[index];
		if (codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}
		if (!currentSessionId.value) {
			throw new Error('No valid current session id');
		}

		codeDiffMessage.replacing = true;
		try {
			const result = await replaceCode(rootStore.restApiContext, {
				suggestionId: codeDiffMessage.suggestionId,
				sessionId: currentSessionId.value,
			});
			// todo update node
			codeDiffMessage.replaced = true;
		} catch (e) {
			codeDiffMessage.error = false;
		}
		codeDiffMessage.replacing = false;
	}

	async function undoCodeDiff(index: number) {
		// todo
	}

	return {
		chatEnabled,
		chatWidth,
		chatMessages,
		chatWindowOpen,
		canShowAssistant,
		canShowAssistantFloatingButton,
		closeChat,
		openChat,
		updateWindowWidth,
		isNodeErrorActive,
		initErrorHelper,
		sendMessage,
		applyCodeDiff,
		undoCodeDiff,
	};
});
