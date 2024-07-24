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
import { useMessage } from '@/composables/useMessage';
import { ndvEventBus } from '@/event-bus';
import { useNDVStore } from './ndv.store';
import type { IPushDataNodeExecuteAfter, IUpdateInformation } from '@/Interface';

const MAX_CHAT_WIDTH = 425;
const MIN_CHAT_WIDTH = 250;
const ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS, VIEWS.EXECUTION_PREVIEW];
const READABLE_TYPES = ['code-diff', 'text', 'block'];

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
	const message = useMessage();
	const ndvStore = useNDVStore();

	const suggestions = ref<{
		[suggestionId: string]: {
			previous: INodeParameters;
			suggested: INodeParameters;
		};
	}>({});
	const chatSessionError = ref<ChatRequest.ErrorContext | undefined>();
	const currentSessionId = ref<string | undefined>();
	const currentSessionActiveExecutionId = ref<string | undefined>();

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

	const unreadCount = computed(() =>
		chatMessages.value.reduce(
			(count, msg) =>
				READABLE_TYPES.includes(msg.type) && msg.role === 'assistant' && !msg.read
					? count + 1
					: count,
			0,
		),
	);

	const lastUnread = ref<ChatUI.AssistantMessage | undefined>();

	function closeChat() {
		chatWindowOpen.value = false;
	}

	function openChat() {
		chatWindowOpen.value = true;
		chatMessages.value = chatMessages.value.map((msg) => ({ ...msg, read: true }));
	}

	function addAssistantMessages(assistantMessages: ChatRequest.MessageResponse[], id: string) {
		const read = chatWindowOpen.value;
		const messages = [...chatMessages.value].filter(
			(msg) => !(msg.id === id && msg.role === 'assistant'),
		);
		// todo simplify
		assistantMessages.forEach((message) => {
			if (message.type === 'message') {
				messages.push({
					id,
					type: 'text',
					role: 'assistant',
					content: message.text,
					quickReplies: message.quickReplies,
					read,
				});
			} else if (message.type === 'code-diff') {
				messages.push({
					id,
					role: 'assistant',
					type: 'code-diff',
					description: message.description,
					codeDiff: message.codeDiff,
					suggestionId: message.suggestionId,
					quickReplies: message.quickReplies,
					read,
				});
			} else if (message.type === 'summary') {
				messages.push({
					id,
					type: 'block',
					role: 'assistant',
					title: message.title,
					content: message.content,
					quickReplies: message.quickReplies,
					read,
				});
			} else if (message.type === 'event') {
				messages.push({
					id,
					type: 'event',
					role: 'assistant',
					eventName: message.eventName,
					read: true,
				});
			}
		});
		chatMessages.value = messages;
	}

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	function isNodeErrorActive(context: ChatRequest.ErrorContext) {
		const targetNode = context.node.name;

		return (
			workflowsStore.activeExecutionId === currentSessionActiveExecutionId.value &&
			targetNode === chatSessionError.value?.node.name
		);
	}

	function clearMessages() {
		chatMessages.value = [];
	}

	function stopStreaming() {
		streaming.value = false;
	}

	function addAssistantError(content: string, id: string) {
		chatMessages.value.push({
			id,
			role: 'assistant',
			type: 'error',
			content,
			read: true,
		});
	}

	function addEmptyAssistantMessage(id: string) {
		chatMessages.value.push({
			id,
			role: 'assistant',
			type: 'text',
			content: '',
			read: false,
		});
	}

	function addUserMessage(content: string, id: string) {
		chatMessages.value.push({
			id,
			role: 'user',
			type: 'text',
			content,
			read: true,
		});
	}

	function handleServiceError(e: unknown, id: string) {
		assert(e instanceof Error);
		stopStreaming();
		addAssistantError(`There was an error reaching the service: (${e.message})`, id);
	}

	function onEachStreamingMessage(response: ChatRequest.ResponsePayload, id: string) {
		if (response.sessionId && !currentSessionId.value) {
			currentSessionId.value = response.sessionId;
		}
		addAssistantMessages(response.messages, id);
	}

	function getRandomId() {
		return `${Math.floor(Math.random() * 10000)}`;
	}

	function onDoneStreaming(id: string) {
		stopStreaming();
		console.log('yo messages', id, chatMessages.value);
		lastUnread.value = chatMessages.value.find(
			(msg) =>
				msg.id === id && !msg.read && msg.role === 'assistant' && READABLE_TYPES.includes(msg.type),
		);
		console.log('last unread', lastUnread.value);
		setTimeout(() => {
			if (lastUnread.value?.id === id) {
				lastUnread.value = undefined;
			}
		}, 4000);
	}

	async function initErrorHelper(context: ChatRequest.ErrorContext) {
		const id = getRandomId();
		if (chatSessionError.value) {
			if (isNodeErrorActive(context)) {
				// context has not changed
				return;
			}

			// todo localization
			await message.confirm(
				'You already have an active AI Assistant session. Starting a new session will clear your current conversation history. Are you sure you want to start a new session?',
				'Start new AI Assistant session?',
				{
					confirmButtonText: 'Start new session',
				},
			);
		}

		clearMessages();
		chatSessionError.value = context;
		if (workflowsStore.activeExecutionId) {
			currentSessionActiveExecutionId.value = workflowsStore.activeExecutionId;
		}

		addEmptyAssistantMessage(id);
		openChat();

		streaming.value = true;
		chatWithAssistant(
			rootStore.restApiContext,
			{
				payload: {
					role: 'user',
					type: 'init-error-helper',
					user: {
						firstName: usersStore.currentUser?.firstName ?? '',
					},
					error: context.error,
					node: context.node,
					// executionSchema todo
				},
			},
			(msg) => onEachStreamingMessage(msg, id),
			() => onDoneStreaming(id),
			(e) => handleServiceError(e, id),
		);
	}

	async function sendEvent(
		eventName: ChatRequest.InteractionEventName,
		error?: ChatRequest.ErrorContext['error'],
	) {
		assert(currentSessionId.value);

		const id = getRandomId();
		addEmptyAssistantMessage(id);
		chatWithAssistant(
			rootStore.restApiContext,
			{
				payload: {
					role: 'user',
					type: 'event',
					eventName,
					error,
				},
				sessionId: currentSessionId.value,
			},
			(msg) => onEachStreamingMessage(msg, id),
			() => onDoneStreaming(id),
			(e) => handleServiceError(e, id),
		);
	}

	async function onNodeExecution(pushEvent: IPushDataNodeExecuteAfter) {
		if (!chatSessionError.value || pushEvent.nodeName !== chatSessionError.value.node.name) {
			return;
		}

		if (pushEvent.data.error) {
			await sendEvent('node-execution-errored', pushEvent.data.error);
		} else if (pushEvent.data.executionStatus === 'success') {
			await sendEvent('node-execution-succeeded');
		}
	}

	async function sendMessage(
		message: Pick<ChatRequest.UserChatMessage, 'text' | 'quickReplyType'>,
	) {
		const id = getRandomId();
		try {
			addUserMessage(message.text, id);
			addEmptyAssistantMessage(id);

			streaming.value = true;
			assert(currentSessionId.value);
			chatWithAssistant(
				rootStore.restApiContext,
				{
					payload: {
						role: 'user',
						type: 'message',
						text: message.text,
						quickReplyType: message.quickReplyType,
					},
					sessionId: currentSessionId.value,
				},
				(msg) => onEachStreamingMessage(msg, id),
				() => onDoneStreaming(id),
				(e) => handleServiceError(e, id),
			);
		} catch (e: unknown) {
			// in case of assert
			handleServiceError(e, id);
		}
	}

	function updateParameters(nodeName: string, parameters: INodeParameters) {
		if (ndvStore.activeNodeName === nodeName) {
			Object.keys(parameters).forEach((key) => {
				const update: IUpdateInformation = {
					node: nodeName,
					name: `parameters.${key}`,
					value: parameters[key],
				};

				ndvEventBus.emit('updateParameterValue', update);
			});
		} else {
			workflowsStore.setNodeParameters(
				{
					name: nodeName,
					value: parameters,
				},
				true,
			);
		}
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

			const currentWorkflow = workflowsStore.getCurrentWorkflow();
			const activeNode = currentWorkflow.getNode(chatSessionError.value.node.name);
			assert(activeNode);

			const cached = suggestions.value[suggestionId];
			if (cached) {
				updateParameters(activeNode.name, cached.suggested);
			} else {
				const { parameters: suggested } = await replaceCode(rootStore.restApiContext, {
					suggestionId: codeDiffMessage.suggestionId,
					sessionId: currentSessionId.value,
				});

				suggestions.value[suggestionId] = {
					previous: getRelevantParameters(activeNode.parameters, Object.keys(suggested)),
					suggested,
				};
				updateParameters(activeNode.name, suggested);
			}

			codeDiffMessage.replaced = true;
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	async function undoCodeDiff(index: number) {
		const codeDiffMessage = chatMessages.value[index];
		if (!codeDiffMessage || codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}

		try {
			assert(chatSessionError.value);
			assert(currentSessionId.value);

			codeDiffMessage.replacing = true;
			const suggestionId = codeDiffMessage.suggestionId;

			const suggestion = suggestions.value[suggestionId];
			assert(suggestion);

			const currentWorkflow = workflowsStore.getCurrentWorkflow();
			const activeNode = currentWorkflow.getNode(chatSessionError.value.node.name);
			assert(activeNode);

			const suggested = suggestion.previous;
			updateParameters(activeNode.name, suggested);

			codeDiffMessage.replaced = false;
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	return {
		chatWidth,
		chatMessages,
		unreadCount,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		canShowAssistantButtons,
		lastUnread,
		onNodeExecution,
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
