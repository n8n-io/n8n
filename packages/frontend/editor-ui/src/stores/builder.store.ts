import { chatWithBuilder, getAiSessions } from '@/api/ai';
import type { VIEWS } from '@/constants';
import {
	ASK_AI_SLIDE_OUT_DURATION_MS,
	EDITABLE_CANVAS_VIEWS,
	WORKFLOW_BUILDER_EXPERIMENT,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { ChatRequest } from '@/types/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from './users.store';
import { useRoute } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { assert } from '@n8n/utils/assert';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUIStore } from './ui.store';
import { usePostHog } from './posthog.store';
import { DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH } from './assistant.store';
import { useWorkflowsStore } from './workflows.store';
import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';
import { useAiMessages } from '@/composables/useAiMessages';

export const ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS];

export const useBuilderStore = defineStore(STORES.BUILDER, () => {
	// Core state
	const chatWidth = ref<number>(DEFAULT_CHAT_WIDTH);
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const streaming = ref<boolean>(false);
	const assistantThinkingMessage = ref<string | undefined>();

	// Store dependencies
	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const assistantHelpers = useAIAssistantHelpers();
	const aiMessages = useAiMessages();

	// Computed properties
	const isAssistantEnabled = computed(() => settings.isAiAssistantEnabled);

	const workflowPrompt = computed(() => {
		const firstUserMessage = chatMessages.value.find(
			(msg) => msg.role === 'user' && msg.type === 'text',
		) as ChatUI.TextMessage;

		return firstUserMessage?.content;
	});
	const canShowAssistant = computed(
		() => isAssistantEnabled.value && ENABLED_VIEWS.includes(route.name as VIEWS),
	);

	const canShowAssistantButtonsOnCanvas = computed(
		() => isAssistantEnabled.value && EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS),
	);

	const isAssistantOpen = computed(() => canShowAssistant.value && chatWindowOpen.value);

	const isAIBuilderEnabled = computed(() => {
		return (
			posthogStore.getVariant(WORKFLOW_BUILDER_EXPERIMENT.name) ===
			WORKFLOW_BUILDER_EXPERIMENT.variant
		);
	});

	// No need to track unread messages in the AI Builder
	const unreadCount = computed(() => 0);

	// Chat management functions
	function resetBuilderChat() {
		clearMessages();
		assistantThinkingMessage.value = undefined;
	}

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
			if (!window) {
				return; // for unit testing
			}

			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth,
			};
		}, ASK_AI_SLIDE_OUT_DURATION_MS + 50);
	}

	function clearMessages() {
		chatMessages.value = aiMessages.clearMessages();
	}

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	// Message handling functions
	function addAssistantMessages(newMessages: ChatRequest.MessageResponse[], id: string) {
		const result = aiMessages.processAssistantMessages(chatMessages.value, newMessages, id);

		chatMessages.value = result.messages;

		if (result.shouldClearThinking) {
			assistantThinkingMessage.value = undefined;
		}

		if (result.thinkingMessage) {
			assistantThinkingMessage.value = result.thinkingMessage;
		}

		console.log('🚀 ~ addAssistantMessages ~ messages:', result.messages);
	}

	function addAssistantError(content: string, id: string, retry?: () => Promise<void>) {
		const errorMessage = aiMessages.createErrorMessage(content, id, retry);
		chatMessages.value = aiMessages.addMessages(chatMessages.value, [errorMessage]);
	}

	function addLoadingAssistantMessage(message: string) {
		assistantThinkingMessage.value = message;
	}

	function addUserMessage(content: string, id: string) {
		const userMessage = aiMessages.createUserMessage(content, id);
		chatMessages.value = aiMessages.addMessages(chatMessages.value, [userMessage]);
	}

	function stopStreaming() {
		streaming.value = false;
	}

	// Error handling
	function handleServiceError(e: unknown, id: string, retry?: () => Promise<void>) {
		assert(e instanceof Error);
		console.log(e);
		stopStreaming();
		assistantThinkingMessage.value = undefined;
		addAssistantError(
			locale.baseText('aiAssistant.serviceError.message', { interpolate: { message: e.message } }),
			id,
			retry,
		);
		telemetry.track('Workflow generation errored', {
			error: e.message,
			prompt: workflowPrompt.value,
		});
	}

	// API interaction
	function getRandomId() {
		return `${Math.floor(Math.random() * 100000000)}`;
	}

	function onEachStreamingMessage(response: ChatRequest.ResponsePayload, id: string) {
		addAssistantMessages(response.messages, id);
	}

	function onDoneStreaming() {
		stopStreaming();
	}

	// Core API functions
	async function initBuilderChat(userMessage: string, source: 'chat' | 'canvas') {
		telemetry.track('User submitted workflow prompt', {
			source,
			prompt: userMessage,
		});
		// Don't reset chat to preserve conversation history
		const id = getRandomId();

		addUserMessage(userMessage, id);
		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));
		openChat();
		streaming.value = true;

		const nodes = workflowsStore.workflow.nodes.map((node) => node.name);
		const schemas = assistantHelpers.getNodesSchemas(nodes);
		const payload: ChatRequest.InitBuilderChat = {
			role: 'user',
			type: 'init-builder-chat',
			user: {
				firstName: usersStore.currentUser?.firstName ?? '',
			},
			question: userMessage,
			// @ts-ignore
			executionData: schemas ?? {},
			workflowContext: {
				currentWorkflow: {
					...assistantHelpers.simplifyWorkflowForAssistant(workflowsStore.workflow),
					id: workflowsStore.workflowId,
				},
			},
		};
		console.log('Payload: ', payload);
		chatWithBuilder(
			rootStore.restApiContext,
			{
				payload,
			},
			(msg) => onEachStreamingMessage(msg, getRandomId()),
			() => onDoneStreaming(),
			(e) => handleServiceError(e, id, async () => await initBuilderChat(userMessage, 'chat')),
		);
	}

	async function sendMessage(
		chatMessage: Pick<ChatRequest.UserChatMessage, 'text' | 'quickReplyType'>,
	) {
		if (streaming.value) {
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

			chatWithBuilder(
				rootStore.restApiContext,
				{
					sessionId: '', //TODO: remove this
					payload: {
						role: 'user',
						type: 'message',
						text: chatMessage.text,
						quickReplyType: chatMessage.quickReplyType,
						workflowContext: {
							currentWorkflow: {
								...assistantHelpers.simplifyWorkflowForAssistant(workflowsStore.workflow),
								id: workflowsStore.workflowId,
							},
						},
					},
				},
				(msg) => onEachStreamingMessage(msg, getRandomId()),
				() => onDoneStreaming(),
				(e) => handleServiceError(e, id, retry),
			);
		} catch (e: unknown) {
			handleServiceError(e, id, retry);
		}
	}

	async function loadSessions() {
		try {
			const workflowId = workflowsStore.workflowId;
			console.log('🚀 ~ loadSessions ~ workflowId:', workflowId);
			const response = await getAiSessions(rootStore.restApiContext, workflowId);
			console.log('🚀 ~ loadSessions ~ response:', response);

			// Load the most recent session if available
			if (response.sessions && response.sessions.length > 0) {
				const latestSession = response.sessions[0];

				// Clear existing messages
				clearMessages();

				// Convert and add messages from the session
				latestSession.messages.forEach((msg) => {
					const id = getRandomId();
					const formattedMsg = aiMessages.mapAssistantMessageToUI(msg, id);
					chatMessages.value.push(formattedMsg);
				});
			}

			return response.sessions;
		} catch (error) {
			console.error('Failed to load AI sessions:', error);
			return [];
		}
	}

	// Reset on route change (but only if actually leaving the workflow view)
	watch(route, (newRoute, oldRoute) => {
		// Only reset if we're actually navigating away from the workflow
		if (newRoute.name !== oldRoute?.name) {
			resetBuilderChat();
		}
	});

	// Public API
	return {
		// State
		isAssistantEnabled,
		canShowAssistantButtonsOnCanvas,
		chatWidth,
		chatMessages,
		unreadCount,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		assistantThinkingMessage,
		chatWindowOpen,
		isAIBuilderEnabled,
		workflowPrompt,

		// Methods
		updateWindowWidth,
		closeChat,
		openChat,
		resetBuilderChat,
		initBuilderChat,
		sendMessage,
		addAssistantMessages,
		handleServiceError,
		loadSessions,
	};
});
