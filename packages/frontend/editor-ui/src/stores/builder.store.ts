import { chatWithBuilder } from '@/api/ai';
import type { VIEWS } from '@/constants';
import { EDITABLE_CANVAS_VIEWS, STORES, WORKFLOW_BUILDER_EXPERIMENT } from '@/constants';
import type { ChatRequest } from '@/types/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRootStore } from './root.store';
import { useUsersStore } from './users.store';
import { useRoute } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { assert } from '@n8n/utils/assert';
import { useWorkflowsStore } from './workflows.store';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUIStore } from './ui.store';
import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';
import { usePostHog } from './posthog.store';
import { useNodeTypesStore } from './nodeTypes.store';

export const MAX_CHAT_WIDTH = 425;
export const MIN_CHAT_WIDTH = 250;
export const DEFAULT_CHAT_WIDTH = 330;
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
	const workflowsStore = useWorkflowsStore();
	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const assistantHelpers = useAIAssistantHelpers();
	const posthogStore = usePostHog();
	const nodeTypesStore = useNodeTypesStore();

	// Computed properties
	const isAssistantEnabled = computed(() => settings.isAiAssistantEnabled);

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
		setTimeout(() => {
			uiStore.appGridDimensions = {
				...uiStore.appGridDimensions,
				width: window.innerWidth,
			};
			// Always reset the chat when closed
			// resetBuilderChat();
		}, 200);
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
			} else if (msg.type === 'workflow-step' && 'steps' in msg) {
				messages.push({
					id,
					type: 'workflow-step',
					role: 'assistant',
					steps: msg.steps,
					read,
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
			} else if (msg.type === 'workflow-connections' && 'workflowJSON' in msg) {
				messages.push({
					id,
					type: 'workflow-connections',
					role: 'assistant',
					workflowJSON: msg.workflowJSON,
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

	// Get current workflow context for the AI
	function getWorkflowContext(): ChatRequest.AssistantContext | undefined {
		const currentView = route.name as VIEWS;
		return {
			currentView: {
				name: currentView,
				description: assistantHelpers.getCurrentViewDescription(currentView),
			},
			currentWorkflow: assistantHelpers.simplifyWorkflowForAssistant(workflowsStore.workflow),
		};
	}

	// Core API functions
	async function initSupportChat(userMessage: string) {
		resetBuilderChat();
		const id = getRandomId();
		const visualContext = getWorkflowContext();

		addUserMessage(userMessage, id);
		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));
		openChat();
		streaming.value = true;

		const payload: ChatRequest.InitSupportChat = {
			role: 'user',
			type: 'init-support-chat',
			user: {
				firstName: usersStore.currentUser?.firstName ?? '',
			},
			context: visualContext,
			question: userMessage,
		};

		chatWithBuilder(
			rootStore.restApiContext,
			{
				payload,
			},
			(msg) => onEachStreamingMessage(msg, id),
			() => onDoneStreaming(),
			(e) => handleServiceError(e, id, async () => await initSupportChat(userMessage)),
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
			const userContext = getWorkflowContext();

			chatWithBuilder(
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
				() => onDoneStreaming(),
				(e) => handleServiceError(e, id, retry),
			);

			// Track user messages for analytics
			telemetry.track('User sent message in Builder', {
				message: chatMessage.text,
				is_quick_reply: !!chatMessage.quickReplyType,
				chat_session_id: currentSessionId.value,
				task: 'workflow-generation',
			});
		} catch (e: unknown) {
			// in case of assert
			handleServiceError(e, id, retry);
		}
	}

	function trackUserOpenedAssistant({ source }: { source: string }) {
		telemetry.track('User opened assistant', {
			source,
			task: 'support',
			has_existing_session: !!currentSessionId.value,
			workflow_id: workflowsStore.workflowId,
			chat_session_id: currentSessionId.value,
		});
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

		// Methods
		updateWindowWidth,
		closeChat,
		openChat,
		resetBuilderChat,
		initSupportChat,
		sendMessage,
		addAssistantMessages,
		handleServiceError,
		trackUserOpenedAssistant,
	};
});
