import { chatWithAssistant, replaceCode } from '@/api/ai';
import {
	VIEWS,
	EDITABLE_CANVAS_VIEWS,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	CREDENTIAL_EDIT_MODAL_KEY,
	ASK_AI_SLIDE_OUT_DURATION_MS,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { ChatRequest } from '@/types/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { defineStore } from 'pinia';
import type { PushPayload } from '@n8n/api-types';
import { computed, h, ref, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from './users.store';
import { useRoute } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { assert } from '@n8n/utils/assert';
import { useWorkflowsStore } from './workflows.store';
import type { ICredentialType, INodeParameters, NodeError, INode } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { ndvEventBus, codeNodeEditorEventBus } from '@/event-bus';
import { useNDVStore } from './ndv.store';
import type { IUpdateInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useUIStore } from './ui.store';
import AiUpdatedCodeMessage from '@/components/AiUpdatedCodeMessage.vue';
import { useCredentialsStore } from './credentials.store';
import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';
import { useBuilderStore } from './builder.store';

export const MAX_CHAT_WIDTH = 425;
export const MIN_CHAT_WIDTH = 300;
export const DEFAULT_CHAT_WIDTH = 330;
export const ENABLED_VIEWS = [
	...EDITABLE_CANVAS_VIEWS,
	VIEWS.EXECUTION_PREVIEW,
	VIEWS.WORKFLOWS,
	VIEWS.CREDENTIALS,
	VIEWS.PROJECTS_CREDENTIALS,
	VIEWS.PROJECTS_WORKFLOWS,
	VIEWS.PROJECT_SETTINGS,
	VIEWS.TEMPLATE_SETUP,
];
const READABLE_TYPES = ['code-diff', 'text', 'block'];

export const useAssistantStore = defineStore(STORES.ASSISTANT, () => {
	const chatWidth = ref<number>(DEFAULT_CHAT_WIDTH);

	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const usersStore = useUsersStore();
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();
	const route = useRoute();
	const streaming = ref<boolean>();
	const ndvStore = useNDVStore();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const assistantHelpers = useAIAssistantHelpers();
	const builderStore = useBuilderStore();

	const suggestions = ref<{
		[suggestionId: string]: {
			previous: INodeParameters;
			suggested: INodeParameters;
		};
	}>({});

	type NodeExecutionStatus = 'error' | 'not_executed' | 'success';

	const chatSessionCredType = ref<ICredentialType | undefined>();
	const chatSessionError = ref<ChatRequest.ErrorContext | undefined>();
	const currentSessionId = ref<string | undefined>();
	const currentSessionActiveExecutionId = ref<string | undefined>(undefined);
	const currentSessionWorkflowId = ref<string | undefined>();
	const lastUnread = ref<ChatUI.AssistantMessage | undefined>();
	const nodeExecutionStatus = ref<NodeExecutionStatus>('not_executed');
	// This is used to show a message when the assistant is performing intermediate steps
	// We use streaming for assistants that support it, and this for agents
	const assistantThinkingMessage = ref<string | undefined>();
	const chatSessionTask = ref<'error' | 'support' | 'credentials' | undefined>();
	// Indicate if last sent workflow and execution data is stale
	const workflowDataStale = ref<boolean>(true);
	const workflowExecutionDataStale = ref<boolean>(true);

	const assistantMessages = computed(() =>
		chatMessages.value.filter((msg) => msg.role === 'assistant'),
	);
	const usersMessages = computed(() => chatMessages.value.filter((msg) => msg.role === 'user'));

	const isSessionEnded = computed(() => {
		const lastAssistantMessage = assistantMessages.value[assistantMessages.value.length - 1];

		const sessionExplicitlyEnded =
			lastAssistantMessage?.type === 'event' && lastAssistantMessage?.eventName === 'end-session';
		const sessionStarted = currentSessionId.value !== undefined;

		return !sessionStarted || sessionExplicitlyEnded;
	});

	const isAssistantOpen = computed(() => canShowAssistant.value && chatWindowOpen.value);

	const isAssistantEnabled = computed(() => settings.isAiAssistantEnabled);

	const canShowAssistant = computed(
		() => isAssistantEnabled.value && ENABLED_VIEWS.includes(route.name as VIEWS),
	);

	const canShowAssistantButtonsOnCanvas = computed(
		() => isAssistantEnabled.value && EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS),
	);
	const hideAssistantFloatingButton = computed(
		() =>
			(route.name === VIEWS.WORKFLOW || route.name === VIEWS.NEW_WORKFLOW) &&
			!workflowsStore.activeNode(),
	);

	const unreadCount = computed(
		() =>
			chatMessages.value.filter(
				(msg) => READABLE_TYPES.includes(msg.type) && msg.role === 'assistant' && !msg.read,
			).length,
	);

	function resetAssistantChat() {
		clearMessages();
		currentSessionId.value = undefined;
		chatSessionError.value = undefined;
		lastUnread.value = undefined;
		currentSessionActiveExecutionId.value = undefined;
		suggestions.value = {};
		nodeExecutionStatus.value = 'not_executed';
		chatSessionCredType.value = undefined;
		chatSessionTask.value = undefined;
		currentSessionWorkflowId.value = workflowsStore.workflowId;
	}

	// As assistant sidebar opens and closes, use window width to calculate the container width
	// This will prevent animation race conditions from making ndv twitchy
	function openChat() {
		chatWindowOpen.value = true;
		chatMessages.value = chatMessages.value.map((msg) => ({ ...msg, read: true }));
		uiStore.appGridDimensions = {
			...uiStore.appGridDimensions,
			width: window.innerWidth - chatWidth.value,
		};
	}

	function closeChat() {
		chatWindowOpen.value = false;
		// Looks smoother if we wait for slide animation to finish before updating the grid width
		// Has to wait for longer than SlideTransition duration
		setTimeout(() => {
			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth,
			};
			// If session has ended, reset the chat
			if (isSessionEnded.value) {
				resetAssistantChat();
			}
		}, ASK_AI_SLIDE_OUT_DURATION_MS + 50);
	}

	function toggleChatOpen() {
		if (chatWindowOpen.value) {
			closeChat();
		} else {
			if (builderStore.isAIBuilderEnabled) {
				// If builder is enabled, open it instead of assistant
				void builderStore.openChat();
				return;
			}
			openChat();
		}
	}

	function addAssistantMessages(newMessages: ChatRequest.MessageResponse[], id: string) {
		const read = chatWindowOpen.value;
		const messages = [...chatMessages.value].filter(
			(msg) => !(msg.id === id && msg.role === 'assistant'),
		);
		assistantThinkingMessage.value = undefined;
		(newMessages ?? []).forEach((msg) => {
			if (msg.type === 'message') {
				messages.push({
					id,
					type: 'text',
					role: 'assistant',
					content: msg.text,
					quickReplies: msg.quickReplies,
					codeSnippet: msg.codeSnippet,
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
			} else if (msg.type === 'intermediate-step') {
				assistantThinkingMessage.value = msg.text;
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
			chatSessionTask.value === 'error' &&
			workflowsStore.activeExecutionId === currentSessionActiveExecutionId.value &&
			targetNode === chatSessionError.value?.node.name
		);
	}

	function isCredTypeActive(credType: ICredentialType) {
		return (
			chatSessionTask.value === 'credentials' && credType.name === chatSessionCredType.value?.name
		);
	}

	function clearMessages() {
		chatMessages.value = [];
	}

	function stopStreaming() {
		streaming.value = false;
	}

	function addAssistantError(content: string, id: string, retry?: () => Promise<void>) {
		chatMessages.value.push({
			id,
			role: 'assistant',
			type: 'error',
			content,
			read: true,
			retry,
		});
	}

	function addLoadingAssistantMessage(message: string) {
		assistantThinkingMessage.value = message;
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

	function handleServiceError(e: unknown, id: string, retry?: () => Promise<void>) {
		assert(e instanceof Error);
		stopStreaming();
		assistantThinkingMessage.value = undefined;
		addAssistantError(
			locale.baseText('aiAssistant.serviceError.message', { interpolate: { message: e.message } }),
			id,
			retry,
		);
	}

	function onEachStreamingMessage(response: ChatRequest.ResponsePayload, id: string) {
		if (response.sessionId && !currentSessionId.value) {
			currentSessionId.value = response.sessionId;
			telemetry.track('Assistant session started', {
				chat_session_id: currentSessionId.value,
				task: chatSessionTask.value,
				node_type: chatSessionError.value?.node.type,
				credential_type: chatSessionCredType.value?.name,
			});
			// Track first user message in support chat now that we have a session id
			if (usersMessages.value.length === 1 && chatSessionTask.value === 'support') {
				const firstUserMessage = usersMessages.value[0] as ChatUI.TextMessage;
				trackUserMessage(firstUserMessage.content, false);
			}
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
		workflowDataStale.value = false;
		workflowExecutionDataStale.value = false;
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

	async function initCredHelp(credType: ICredentialType) {
		const hasExistingSession = !!currentSessionId.value;
		const credentialName = credType.displayName;
		const question = `How do I set up the credentials for ${credentialName}?`;

		await initSupportChat(question, credType);

		trackUserOpenedAssistant({
			source: 'credential',
			task: 'credentials',
			has_existing_session: hasExistingSession,
		});
	}

	/**
	 * Gets information about the current view and active node to provide context to the assistant
	 */
	function getVisualContext(
		nodeInfo?: ChatRequest.NodeInfo,
	): ChatRequest.AssistantContext | undefined {
		if (chatSessionTask.value === 'error') {
			return undefined;
		}
		const currentView = route.name as VIEWS;
		const activeNode = workflowsStore.activeNode();
		const activeNodeForLLM = activeNode
			? assistantHelpers.processNodeForAssistant(activeNode, ['position', 'parameters.notice'])
			: null;
		const activeModals = uiStore.activeModals;
		const isCredentialModalActive = activeModals.includes(CREDENTIAL_EDIT_MODAL_KEY);
		const activeCredential = isCredentialModalActive
			? useCredentialsStore().getCredentialTypeByName(uiStore.activeCredentialType ?? '')
			: undefined;
		const executionResult = workflowsStore.workflowExecutionData?.data?.resultData;
		const isCurrentNodeExecuted = Boolean(
			executionResult?.runData?.hasOwnProperty(activeNode?.name ?? ''),
		);
		const currentNodeHasError =
			executionResult?.error &&
			'node' in executionResult.error &&
			executionResult.error.node?.name === activeNode?.name;
		const nodeError = currentNodeHasError ? (executionResult.error as NodeError) : undefined;
		const executionStatus = isCurrentNodeExecuted
			? {
					status: nodeError ? 'error' : 'success',
					error: nodeError ? assistantHelpers.simplifyErrorForAssistant(nodeError) : undefined,
				}
			: undefined;
		return {
			currentView: {
				name: currentView,
				description: assistantHelpers.getCurrentViewDescription(currentView),
			},
			activeNodeInfo: {
				node: activeNodeForLLM ?? undefined,
				nodeIssues: !isCurrentNodeExecuted ? activeNode?.issues : undefined,
				executionStatus,
				nodeInputData: nodeInfo?.nodeInputData,
				referencedNodes: nodeInfo?.schemas,
			},
			activeCredentials: activeCredential
				? {
						name: activeCredential?.name,
						displayName: activeCredential?.displayName,
						authType: nodeInfo?.authType?.name,
					}
				: undefined,
			currentWorkflow: workflowDataStale.value
				? assistantHelpers.simplifyWorkflowForAssistant(workflowsStore.workflow)
				: undefined,
			executionData:
				workflowExecutionDataStale.value && executionResult
					? assistantHelpers.simplifyResultData(executionResult)
					: undefined,
		};
	}

	async function initSupportChat(userMessage: string, credentialType?: ICredentialType) {
		resetAssistantChat();
		chatSessionTask.value = credentialType ? 'credentials' : 'support';
		const activeNode = workflowsStore.activeNode() as INode;
		const nodeInfo = assistantHelpers.getNodeInfoForAssistant(activeNode);
		// For the initial message, only provide visual context if the task is support
		const visualContext =
			chatSessionTask.value === 'support' ? getVisualContext(nodeInfo) : undefined;

		if (nodeInfo.authType && chatSessionTask.value === 'credentials') {
			userMessage += ` I am using ${nodeInfo.authType.name}.`;
		}

		const id = getRandomId();
		chatSessionCredType.value = credentialType;
		addUserMessage(userMessage, id);
		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));
		openChat();
		streaming.value = true;

		let payload: ChatRequest.InitSupportChat | ChatRequest.InitCredHelp = {
			role: 'user',
			type: 'init-support-chat',
			user: {
				firstName: usersStore.currentUser?.firstName ?? '',
			},
			context: visualContext,
			question: userMessage,
		};
		if (credentialType) {
			payload = {
				...payload,
				type: 'init-cred-help',
				credentialType: {
					name: credentialType.name,
					displayName: credentialType.displayName,
				},
			};
		}

		chatWithAssistant(
			rootStore.restApiContext,
			{
				payload,
			},
			(msg) => onEachStreamingMessage(msg, id),
			() => onDoneStreaming(id),
			(e) =>
				handleServiceError(e, id, async () => await initSupportChat(userMessage, credentialType)),
		);
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
		chatSessionTask.value = 'error';
		chatSessionError.value = context;
		currentSessionWorkflowId.value = workflowsStore.workflowId;

		if (workflowsStore.activeExecutionId) {
			currentSessionActiveExecutionId.value = workflowsStore.activeExecutionId;
		}

		const { authType, nodeInputData, schemas } = assistantHelpers.getNodeInfoForAssistant(
			context.node,
		);

		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.analyzingError'));
		openChat();

		streaming.value = true;
		const payload: ChatRequest.RequestPayload['payload'] = {
			role: 'user',
			type: 'init-error-helper',
			user: {
				firstName: usersStore.currentUser?.firstName ?? '',
			},
			error: context.error,
			node: assistantHelpers.processNodeForAssistant(context.node, [
				'position',
				'parameters.notice',
			]),
			nodeInputData,
			executionSchema: schemas,
			authType,
		};
		chatWithAssistant(
			rootStore.restApiContext,
			{
				payload,
			},
			(msg) => onEachStreamingMessage(msg, id),
			() => onDoneStreaming(id),
			(e) => handleServiceError(e, id, async () => await initErrorHelper(context)),
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
		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));
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
			(e) => handleServiceError(e, id, async () => await sendEvent(eventName, error)),
		);
	}

	async function onNodeExecution(pushEvent: PushPayload<'nodeExecuteAfter'>) {
		if (!chatSessionError.value || pushEvent.nodeName !== chatSessionError.value.node.name) {
			return;
		}

		if (nodeExecutionStatus.value === 'success') {
			return;
		}

		if (pushEvent.data.error && nodeExecutionStatus.value !== 'error') {
			await sendEvent('node-execution-errored', pushEvent.data.error);
			nodeExecutionStatus.value = 'error';
			telemetry.track('User executed node after assistant suggestion', {
				task: chatSessionTask.value,
				chat_session_id: currentSessionId.value,
				success: false,
			});
		} else if (
			pushEvent.data.executionStatus === 'success' &&
			['error', 'not_executed'].includes(nodeExecutionStatus.value)
		) {
			await sendEvent('node-execution-succeeded');
			nodeExecutionStatus.value = 'success';
			telemetry.track('User executed node after assistant suggestion', {
				task: chatSessionTask.value,
				chat_session_id: currentSessionId.value,
				success: true,
			});
		}
	}

	async function sendMessage(
		chatMessage: Pick<ChatRequest.UserChatMessage, 'text' | 'quickReplyType'>,
	) {
		if (isSessionEnded.value || streaming.value) {
			return;
		}

		const id = getRandomId();

		const retry = async () => {
			chatMessages.value = chatMessages.value.filter((msg) => msg.id !== id);
			await sendMessage(chatMessage);
		};

		try {
			addUserMessage(chatMessage.text, id);
			addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));

			streaming.value = true;
			assert(currentSessionId.value);
			if (
				chatMessage.quickReplyType === 'new-suggestion' &&
				nodeExecutionStatus.value !== 'not_executed'
			) {
				nodeExecutionStatus.value = 'not_executed';
			}
			const activeNode = workflowsStore.activeNode() as INode;
			const nodeInfo = assistantHelpers.getNodeInfoForAssistant(activeNode);
			const userContext = getVisualContext(nodeInfo);

			chatWithAssistant(
				rootStore.restApiContext,
				{
					payload: {
						role: 'user',
						type: 'message',
						text: chatMessage.text,
						quickReplyType: chatMessage.quickReplyType,
						context: userContext,
					},
					sessionId: currentSessionId.value,
				},
				(msg) => onEachStreamingMessage(msg, id),
				() => onDoneStreaming(id),
				(e) => handleServiceError(e, id, retry),
			);
			trackUserMessage(chatMessage.text, !!chatMessage.quickReplyType);
		} catch (e: unknown) {
			// in case of assert
			handleServiceError(e, id, retry);
		}
	}

	function trackUserMessage(message: string, isQuickReply: boolean) {
		if (!currentSessionId.value) {
			return;
		}
		telemetry.track('User sent message in Assistant', {
			message,
			is_quick_reply: isQuickReply,
			chat_session_id: currentSessionId.value,
			message_number: usersMessages.value.length,
			task: chatSessionTask.value,
		});
	}

	function trackUserOpenedAssistant({
		source,
		task,
		has_existing_session,
	}: { has_existing_session: boolean } & (
		| {
				source: 'error';
				task: 'error';
		  }
		| {
				source: 'canvas';
				task: 'placeholder';
		  }
		| {
				source: 'credential';
				task: 'credentials';
		  }
	)) {
		telemetry.track('User opened assistant', {
			source,
			task,
			has_existing_session,
			workflow_id: workflowsStore.workflowId,
			node_type: chatSessionError.value?.node?.type,
			error: chatSessionError.value?.error,
			chat_session_id: currentSessionId.value,
		});
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
			showCodeUpdateToastIfNeeded(activeNode.name);
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
			showCodeUpdateToastIfNeeded(activeNode.name);
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	function showCodeUpdateToastIfNeeded(errorNodeName: string) {
		if (errorNodeName !== ndvStore.activeNodeName) {
			useToast().showMessage({
				type: 'success',
				title: locale.baseText('aiAssistant.codeUpdated.message.title'),
				message: h(AiUpdatedCodeMessage, {
					nodeName: errorNodeName,
				}),
				duration: 4000,
			});
		}
	}

	watch(route, () => {
		const activeWorkflowId = workflowsStore.workflowId;
		if (
			!currentSessionId.value ||
			currentSessionWorkflowId.value === PLACEHOLDER_EMPTY_WORKFLOW_ID ||
			currentSessionWorkflowId.value === activeWorkflowId
		) {
			return;
		}
		resetAssistantChat();
	});

	watch(
		() => uiStore.stateIsDirty,
		() => {
			workflowDataStale.value = true;
		},
	);

	watch(
		() => workflowsStore.workflowExecutionResultDataLastUpdate,
		() => {
			workflowExecutionDataStale.value = true;
		},
		{ immediate: true },
	);

	return {
		isAssistantEnabled,
		canShowAssistantButtonsOnCanvas,
		hideAssistantFloatingButton,
		chatWidth,
		chatMessages,
		unreadCount,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		currentSessionId,
		lastUnread,
		isSessionEnded,
		onNodeExecution,
		trackUserOpenedAssistant,
		closeChat,
		openChat,
		toggleChatOpen,
		updateWindowWidth,
		isNodeErrorActive,
		initErrorHelper,
		initSupportChat,
		sendMessage,
		applyCodeDiff,
		undoCodeDiff,
		resetAssistantChat,
		chatWindowOpen,
		addAssistantMessages,
		assistantThinkingMessage,
		chatSessionError,
		chatSessionTask,
		initCredHelp,
		isCredTypeActive,
		handleServiceError,
	};
});
