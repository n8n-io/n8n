import { chatWithAssistant, replaceCode } from '@/api/assistant';
import { VIEWS, EDITABLE_CANVAS_VIEWS, STORES, AI_ASSISTANT_EXPERIMENT } from '@/constants';
import type { ChatRequest } from '@/types/assistant.types';
import type { ChatUI } from 'n8n-design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRootStore } from './root.store';
import { useUsersStore } from './users.store';
import { useRoute } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { assert } from '@/utils/assert';
import { useWorkflowsStore } from './workflows.store';
import type { INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { ndvEventBus, codeNodeEditorEventBus } from '@/event-bus';
import { useNDVStore } from './ndv.store';
import type { IPushDataNodeExecuteAfter, IUpdateInformation } from '@/Interface';
import {
	getMainAuthField,
	getNodeAuthOptions,
	getReferencedNodes,
	getNodesSchemas,
	pruneNodeProperties,
} from '@/utils/nodeTypesUtils';
import { useNodeTypesStore } from './nodeTypes.store';
import { usePostHog } from './posthog.store';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';

export const MAX_CHAT_WIDTH = 425;
export const MIN_CHAT_WIDTH = 250;
export const DEFAULT_CHAT_WIDTH = 325;
export const ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS, VIEWS.EXECUTION_PREVIEW];
const READABLE_TYPES = ['code-diff', 'text', 'block'];

export const useAssistantStore = defineStore(STORES.ASSISTANT, () => {
	const chatWidth = ref<number>(DEFAULT_CHAT_WIDTH);

	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const usersStore = useUsersStore();
	const workflowsStore = useWorkflowsStore();
	const route = useRoute();
	const streaming = ref<boolean>();
	const ndvStore = useNDVStore();
	const { getVariant } = usePostHog();
	const locale = useI18n();
	const telemetry = useTelemetry();

	const suggestions = ref<{
		[suggestionId: string]: {
			previous: INodeParameters;
			suggested: INodeParameters;
		};
	}>({});
	const chatSessionError = ref<ChatRequest.ErrorContext | undefined>();
	const currentSessionId = ref<string | undefined>();
	const currentSessionActiveExecutionId = ref<string | undefined>();
	const currentSessionWorkflowId = ref<string | undefined>();
	const lastUnread = ref<ChatUI.AssistantMessage | undefined>();

	const isExperimentEnabled = computed(
		() => getVariant(AI_ASSISTANT_EXPERIMENT.name) === AI_ASSISTANT_EXPERIMENT.variant,
	);

	const canShowAssistant = computed(
		() =>
			isExperimentEnabled.value &&
			settings.isAiAssistantEnabled &&
			ENABLED_VIEWS.includes(route.name as VIEWS),
	);

	const isSessionEnded = computed(() => {
		const assistantMessages = chatMessages.value.filter((msg) => msg.role === 'assistant');
		const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

		const sessionExplicitlyEnded =
			lastAssistantMessage?.type === 'event' && lastAssistantMessage?.eventName === 'end-session';
		const sessionStarted = currentSessionId.value !== undefined;

		return !sessionStarted || sessionExplicitlyEnded;
	});

	const isAssistantOpen = computed(() => canShowAssistant.value && chatWindowOpen.value);

	const canShowAssistantButtons = computed(
		() =>
			isExperimentEnabled.value &&
			settings.isAiAssistantEnabled &&
			EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS),
	);

	const unreadCount = computed(
		() =>
			chatMessages.value.filter(
				(msg) => READABLE_TYPES.includes(msg.type) && msg.role === 'assistant' && !msg.read,
			).length,
	);

	watch(route, () => {
		const activeWorkflowId = workflowsStore.workflowId;
		if (!currentSessionId.value || currentSessionWorkflowId.value === activeWorkflowId) {
			return;
		}
		resetAssistantChat();
	});

	function resetAssistantChat() {
		clearMessages();
		currentSessionId.value = undefined;
		chatSessionError.value = undefined;
		lastUnread.value = undefined;
		currentSessionActiveExecutionId.value = undefined;
		suggestions.value = {};
	}

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
		// TODO: simplify
		assistantMessages.forEach((msg) => {
			if (msg.type === 'message') {
				messages.push({
					id,
					type: 'text',
					role: 'assistant',
					content: msg.text,
					quickReplies: msg.quickReplies,
					read,
				});
			} else if (msg.type === 'code-diff') {
				messages.push({
					id,
					role: 'assistant',
					type: 'code-diff',
					description: msg.description,
					codeDiff: msg.codeDiff,
					suggestionId: msg.suggestionId,
					quickReplies: msg.quickReplies,
					read,
				});
			} else if (msg.type === 'summary') {
				messages.push({
					id,
					type: 'block',
					role: 'assistant',
					title: msg.title,
					content: msg.content,
					quickReplies: msg.quickReplies,
					read,
				});
			} else if (msg.type === 'event') {
				messages.push({
					id,
					type: 'event',
					role: 'assistant',
					eventName: msg.eventName,
					read: true,
				});
			} else if (msg.type === 'agent-suggestion') {
				messages.push({
					id,
					type: 'block',
					role: 'assistant',
					title: msg.title,
					content: msg.text,
					quickReplies: msg.quickReplies,
					read,
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
		addAssistantError(`${locale.baseText('aiAssistant.serviceError.message')}: (${e.message})`, id);
	}

	function onEachStreamingMessage(response: ChatRequest.ResponsePayload, id: string) {
		if (response.sessionId && !currentSessionId.value) {
			currentSessionId.value = response.sessionId;
			telemetry.track(
				'Assistant session started',
				{
					chat_session_id: currentSessionId.value,
					task: 'error',
				},
				{ withPostHog: true },
			);
		} else if (currentSessionId.value !== response.sessionId) {
			return;
		}
		addAssistantMessages(response.messages, id);
	}

	function getRandomId() {
		return `${Math.floor(Math.random() * 100000000)}`;
	}

	function onDoneStreaming(id: string) {
		stopStreaming();
		lastUnread.value = chatMessages.value.find(
			(msg) =>
				msg.id === id && !msg.read && msg.role === 'assistant' && READABLE_TYPES.includes(msg.type),
		);
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
		}

		resetAssistantChat();
		chatSessionError.value = context;
		currentSessionWorkflowId.value = workflowsStore.workflowId;

		if (workflowsStore.activeExecutionId) {
			currentSessionActiveExecutionId.value = workflowsStore.activeExecutionId;
		}

		// Get all referenced nodes and their schemas
		const referencedNodeNames = getReferencedNodes(context.node);
		const schemas = getNodesSchemas(referencedNodeNames);

		// Get node credentials details for the ai assistant
		const nodeType = useNodeTypesStore().getNodeType(context.node.type);
		let authType = undefined;
		if (nodeType) {
			const authField = getMainAuthField(nodeType);
			const credentialInUse = context.node.parameters[authField?.name ?? ''];
			const availableAuthOptions = getNodeAuthOptions(nodeType);
			authType = availableAuthOptions.find((option) => option.value === credentialInUse);
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
					node: pruneNodeProperties(context.node, ['position']),
					executionSchema: schemas,
					authType,
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
		if (isSessionEnded.value || streaming.value) {
			return;
		}
		assert(currentSessionId.value);

		const id = getRandomId();
		addEmptyAssistantMessage(id);
		streaming.value = true;
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
		telemetry.track('User executed node after assistant suggestion', {
			task: 'error',
			chat_session_id: currentSessionId.value,
			success: pushEvent.data.executionStatus === 'success',
		});
	}

	async function sendMessage(
		chatMessage: Pick<ChatRequest.UserChatMessage, 'text' | 'quickReplyType'>,
	) {
		if (isSessionEnded.value || streaming.value) {
			return;
		}

		const id = getRandomId();
		try {
			addUserMessage(chatMessage.text, id);
			addEmptyAssistantMessage(id);

			streaming.value = true;
			assert(currentSessionId.value);
			chatWithAssistant(
				rootStore.restApiContext,
				{
					payload: {
						role: 'user',
						type: 'message',
						text: chatMessage.text,
						quickReplyType: chatMessage.quickReplyType,
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
			codeNodeEditorEventBus.emit('codeDiffApplied');
			checkIfNodeNDVIsOpen(activeNode.name);
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
			codeNodeEditorEventBus.emit('codeDiffApplied');
			checkIfNodeNDVIsOpen(activeNode.name);
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	function checkIfNodeNDVIsOpen(errorNodeName: string) {
		if (errorNodeName !== ndvStore.activeNodeName) {
			useToast().showMessage({
				type: 'success',
				title: locale.baseText('aiAssistant.codeUpdated.message.title'),
				message: locale.baseText('aiAssistant.codeUpdated.message.body', {
					interpolate: { nodeName: errorNodeName },
				}),
				dangerouslyUseHTMLString: true,
				duration: 4000,
			});
		}
	}

	return {
		chatWidth,
		chatMessages,
		unreadCount,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		canShowAssistantButtons,
		currentSessionId,
		lastUnread,
		isSessionEnded,
		onNodeExecution,
		closeChat,
		openChat,
		updateWindowWidth,
		isNodeErrorActive,
		initErrorHelper,
		sendMessage,
		applyCodeDiff,
		undoCodeDiff,
		resetAssistantChat,
		chatWindowOpen,
		addAssistantMessages,
	};
});
