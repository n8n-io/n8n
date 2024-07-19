import { chatWithAssistant, replaceCode } from '@/api/assistant';
import { VIEWS, EDITABLE_CANVAS_VIEWS, STORES } from '@/constants';
import type { ChatRequest } from '@/types/assistant.types';
import type { ChatUI } from 'n8n-design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from './root.store';
import { useUsersStore } from './users.store';
import { useRoute } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { assert } from '@/utils/assert';
import { useWorkflowsStore } from './workflows.store';
import type { INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

const MAX_CHAT_WIDTH = 425;
const MIN_CHAT_WIDTH = 250;
const ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS, VIEWS.EXECUTION_PREVIEW];

export const useAssistantStore = defineStore(STORES.ASSISTANT, () => {
	const chatWidth = ref<number>(275);

	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const usersStore = useUsersStore();
	const workflowsStore = useWorkflowsStore();
	const route = useRoute();
	const streaming = ref<boolean>();

	const suggestions = ref<{
		[suggestionId: string]: {
			previous: INodeParameters;
			suggested: INodeParameters;
		};
	}>({});
	const chatSessionError = ref<ChatRequest.ErrorContext | undefined>();
	const currentSessionId = ref<string | undefined>();

	const canShowAssistant = computed(
		() =>
			settings.isAiAssistantEnabled && route.name && ENABLED_VIEWS.includes(route.name as VIEWS),
	);

	const isAssistantOpen = computed(() => canShowAssistant.value && chatWindowOpen.value);

	const canShowAssistantButtons = computed(
		() =>
			settings.isAiAssistantEnabled &&
			route.name &&
			EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS),
	);

	function closeChat() {
		chatWindowOpen.value = false;
	}

	function openChat() {
		chatWindowOpen.value = true;
	}

	function addAssistantMessages(assistantMessages: ChatRequest.MessageResponse[], i: number) {
		console.log('assistant', assistantMessages);
		const messages = chatMessages.value.slice(0, i);
		assistantMessages.forEach((message) => {
			if (message.type === 'message') {
				messages.push({
					type: 'text',
					role: 'assistant',
					content: message.content,
					quickReplies: message.quickReplies,
				});
			} else if (message.type === 'code-diff') {
				messages.push({
					role: 'assistant',
					type: 'code-diff',
					description: message.description,
					codeDiff: message.codeDiff,
					suggestionId: message.suggestionId,
					quickReplies: message.quickReplies,
				});
			} else if (message.type === 'summary') {
				messages.push({
					type: 'block',
					role: 'assistant',
					title: message.title,
					content: message.content,
					quickReplies: message.quickReplies,
				});
			}
		});
		chatMessages.value = messages;
	}

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	function isNodeErrorActive(context: ChatRequest.ErrorContext) {
		return false;
		const targetNode = context.node.name;
		const errorMessage = context.error.message;

		return (
			targetNode === chatSessionError.value?.node.name &&
			errorMessage === chatSessionError.value?.error.message
		);
	}

	function clearMessages() {
		chatMessages.value = [];
	}

	function stopStreaming() {
		streaming.value = false;
	}

	function addAssistantError(content: string) {
		chatMessages.value.push({
			role: 'assistant',
			type: 'error',
			content,
		});
	}

	function addAssistantLoading() {
		chatMessages.value.push({
			role: 'assistant',
			type: 'text',
			content: '',
			streaming: true,
		});
	}

	function addUserMessage(content: string) {
		chatMessages.value.push({
			role: 'user',
			type: 'text',
			content,
		});
	}

	function handleServiceError(e: unknown) {
		assert(e instanceof Error);
		stopStreaming();
		addAssistantError(`There was an error reaching the service: (${e.message})`);
	}

	function onEachStreamingMessage(response: ChatRequest.ResponsePayload, i: number) {
		if (response.sessionId) {
			currentSessionId.value = response.sessionId;
		}
		addAssistantMessages(response.messages, i);
	}

	async function initErrorHelper(context: ChatRequest.ErrorContext) {
		try {
			if (isNodeErrorActive(context)) {
				return;
			}
			clearMessages();
			chatSessionError.value = context;

			addAssistantLoading();
			const i = chatMessages.value.length;
			openChat();

			streaming.value = true;
			chatWithAssistant(
				rootStore.restApiContext,
				{
					role: 'user',
					type: 'init-error-helper',
					user: {
						firstName: usersStore.currentUser?.firstName ?? '',
					},
					error: context.error,
					node: context.node,
					// executionSchema todo
				},
				(msg) => onEachStreamingMessage(msg, i),
				stopStreaming,
				handleServiceError,
			);
		} catch (e) {
			handleServiceError(e);
		}
	}

	// async function sendEvent(eventName: ChatRequest.InteractionEventName) {
	// 	await chatWithAssistant(rootStore.restApiContext, {
	// 		type: 'event',
	// 		event: eventName,
	// 	});
	// }

	async function sendMessage(
		message: Pick<ChatRequest.UserChatMessage, 'text' | 'quickReplyType'>,
	) {
		try {
			addUserMessage(message.text);
			addAssistantLoading();
			const i = chatMessages.value.length;

			streaming.value = true;
			assert(currentSessionId.value);
			chatWithAssistant(
				rootStore.restApiContext,
				{
					role: 'user',
					type: 'message',
					text: message.text,
					quickReplyType: message.quickReplyType,
					sessionId: currentSessionId.value,
				},
				(msg) => onEachStreamingMessage(msg, i),
				stopStreaming,
				handleServiceError,
			);
		} catch (e: unknown) {
			handleServiceError(e);
		}
	}

	function updateParameters(nodeName: string, parameters: INodeParameters) {
		workflowsStore.setNodeParameters(
			{
				name: nodeName,
				value: parameters,
			},
			true,
		);
	}

	function getRelevantParameters(
		parameters: INodeParameters,
		keysToKeep: string[],
	): INodeParameters {
		return keysToKeep.reduce((accu: INodeParameters, key: string) => {
			accu[key] = deepCopy(parameters[key]);
			return accu;
		}, {} as INodeParameters);
	}

	async function applyCodeDiff(index: number) {
		const codeDiffMessage = chatMessages.value[index];
		if (!codeDiffMessage || codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}

		try {
			assert(chatSessionError.value);
			assert(currentSessionId.value);

			codeDiffMessage.replacing = true;
			const suggestionId = codeDiffMessage.suggestionId;
			const { parameters: suggested } = await replaceCode(rootStore.restApiContext, {
				suggestionId: codeDiffMessage.suggestionId,
				sessionId: currentSessionId.value,
			});

			const currentWorkflow = workflowsStore.getCurrentWorkflow();
			const activeNode = currentWorkflow.getNode(chatSessionError.value.node.name);
			assert(activeNode);

			suggestions.value[suggestionId] = {
				previous: getRelevantParameters(activeNode.parameters, Object.keys(suggested)),
				suggested,
			};
			updateParameters(activeNode.name, suggested);

			codeDiffMessage.replaced = true;
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	async function undoCodeDiff(index: number) {
		// todo
	}

	return {
		chatWidth,
		chatMessages,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		canShowAssistantButtons,
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
