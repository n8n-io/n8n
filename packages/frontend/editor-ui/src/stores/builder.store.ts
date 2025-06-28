import { chatWithBuilder } from '@/api/ai';
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
import { useNodeTypesStore } from './nodeTypes.store';
import { DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH } from './assistant.store';

export const ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS];

export const useBuilderStore = defineStore(STORES.BUILDER, () => {
	// Core state
	const chatWidth = ref<number>(DEFAULT_CHAT_WIDTH);
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const chatWindowOpen = ref<boolean>(false);
	const streaming = ref<boolean>(false);
	const currentSessionId = ref<string | undefined>();
	const assistantThinkingMessage = ref<string | undefined>();

	// Store dependencies
	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const uiStore = useUIStore();
	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const nodeTypesStore = useNodeTypesStore();

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
		currentSessionId.value = undefined;
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
		chatMessages.value = [];
	}

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	// Message handling functions
	function addAssistantMessages(newMessages: ChatRequest.MessageResponse[], id: string) {
		const read = true; // Always mark as read in builder
		const messages = [...chatMessages.value].filter(
			(msg) => !(msg.id === id && msg.role === 'assistant'),
		);
		assistantThinkingMessage.value = undefined;

		newMessages.forEach((msg) => {
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
			} else if (msg.type === 'workflow-step' && 'steps' in msg) {
				messages.push({
					id,
					type: 'workflow-step',
					role: 'assistant',
					steps: msg.steps,
					read,
				});
			} else if (msg.type === 'prompt-validation' && !msg.isWorkflowPrompt) {
				messages.push({
					id,
					role: 'assistant',
					type: 'error',
					content: locale.baseText('aiAssistant.builder.invalidPrompt'),
					read: true,
				});
			} else if (msg.type === 'workflow-node' && 'nodes' in msg) {
				const mappedNodes = msg.nodes.map(
					(node) => nodeTypesStore.getNodeType(node)?.displayName ?? node,
				);
				messages.push({
					id,
					type: 'workflow-node',
					role: 'assistant',
					nodes: mappedNodes,
					read,
				});
			} else if (msg.type === 'workflow-composed' && 'nodes' in msg) {
				messages.push({
					id,
					type: 'workflow-composed',
					role: 'assistant',
					nodes: msg.nodes,
					read,
				});
			} else if (msg.type === 'workflow-generated' && 'codeSnippet' in msg) {
				messages.push({
					id,
					type: 'workflow-generated',
					role: 'assistant',
					codeSnippet: msg.codeSnippet,
					read,
				});
			} else if (msg.type === 'rate-workflow') {
				messages.push({
					id,
					type: 'rate-workflow',
					role: 'assistant',
					content: msg.content,
					read,
				});
			}
		});
		chatMessages.value = messages;
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

	function stopStreaming() {
		streaming.value = false;
	}

	// Error handling
	function handleServiceError(e: unknown, id: string, retry?: () => Promise<void>) {
		assert(e instanceof Error);
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
		if (response.sessionId && !currentSessionId.value) {
			currentSessionId.value = response.sessionId;
			telemetry.track(
				'Assistant session started',
				{
					chat_session_id: currentSessionId.value,
					task: 'workflow-generation',
				},
				{ withPostHog: true },
			);
		} else if (currentSessionId.value !== response.sessionId) {
			// Ignore messages from other sessions
			return;
		}
		addAssistantMessages(response.messages, id);
	}

	function onDoneStreaming() {
		stopStreaming();
	}

	// Core API functions
	async function initBuilderChat(userMessage: string, source: 'chat' | 'canvas') {
		telemetry.track(
			'User submitted workflow prompt',
			{
				source,
				prompt: userMessage,
			},
			{ withPostHog: true },
		);
		resetBuilderChat();
		const id = getRandomId();

		addUserMessage(userMessage, id);
		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));
		openChat();
		streaming.value = true;

		const payload: ChatRequest.InitBuilderChat = {
			role: 'user',
			type: 'init-builder-chat',
			user: {
				firstName: usersStore.currentUser?.firstName ?? '',
			},
			question: userMessage,
		};

		chatWithBuilder(
			rootStore.restApiContext,
			{
				payload,
			},
			(msg) => onEachStreamingMessage(msg, id),
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
			assert(currentSessionId.value);

			chatWithBuilder(
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
				() => onDoneStreaming(),
				(e) => handleServiceError(e, id, retry),
			);
		} catch (e: unknown) {
			// in case of assert
			handleServiceError(e, id, retry);
		}
	}
	// Reset on route change
	watch(route, () => {
		resetBuilderChat();
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
		currentSessionId,
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
	};
});
