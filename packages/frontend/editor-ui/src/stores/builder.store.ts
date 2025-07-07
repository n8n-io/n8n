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
import { useWorkflowsStore } from './workflows.store';
import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';

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
	const nodeTypesStore = useNodeTypesStore();
	const assistantHelpers = useAIAssistantHelpers();

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
		chatMessages.value = [];
	}

	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	// Message handling functions
	function addAssistantMessages(newMessages: ChatRequest.MessageResponse[], id: string) {
		const read = true; // Always mark as read in builder
		const messages = [...chatMessages.value];

		// Clear thinking message when we get any response (text or tool)
		const hasResponse = newMessages.some((msg) => msg.type === 'message' || msg.type === 'tool');
		if (hasResponse) {
			assistantThinkingMessage.value = undefined;
		}

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
			} else if (msg.type === 'workflow-updated' && 'codeSnippet' in msg) {
				messages.push({
					id,
					type: 'workflow-updated',
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
			} else if (msg.type === 'tool' && 'toolName' in msg) {
				console.log(
					'Processing tool message:',
					msg.toolName,
					'status:',
					msg.status,
					'toolCallId:',
					msg.toolCallId,
				);

				if (msg.status === 'running') {
					// Check if this is a progress update for an existing running tool
					const existingRunningToolIndex = messages.findIndex(
						(m) => m.type === 'tool' && m.toolCallId === msg.toolCallId && m.status === 'running',
					);

					if (existingRunningToolIndex > -1) {
						// This is a progress update - append updates to existing message
						console.log('Updating existing running tool with progress');
						messages[existingRunningToolIndex] = {
							...messages[existingRunningToolIndex],
							updates: [
								...(messages[existingRunningToolIndex] as ChatUI.ToolMessage).updates,
								...msg.updates,
							],
						};
					} else {
						// This is a new tool execution
						console.log('Adding new running tool message');
						messages.push({
							id,
							type: 'tool',
							role: 'assistant',
							toolName: msg.toolName,
							toolCallId: msg.toolCallId,
							status: msg.status,
							updates: msg.updates,
							read,
						});
					}
				} else {
					// For completed/error status, find and update the matching running message
					const existingToolMessageIndex = messages.findIndex(
						(m) => m.type === 'tool' && m.toolCallId === msg.toolCallId && m.status === 'running',
					);

					console.log('Found existing tool at index:', existingToolMessageIndex);

					if (existingToolMessageIndex > -1) {
						// Update existing running tool message with completion or error
						console.log('Updating existing tool message to status:', msg.status);
						messages[existingToolMessageIndex] = {
							...messages[existingToolMessageIndex],
							status: msg.status,
							updates: [
								...(messages[existingToolMessageIndex] as ChatUI.ToolMessage).updates,
								...msg.updates,
							],
						};
					} else {
						// If no matching running message found, add as new (shouldn't happen normally)
						console.warn('No matching running tool message found for completion, adding as new');
						messages.push({
							id,
							type: 'tool',
							role: 'assistant',
							toolName: msg.toolName,
							toolCallId: msg.toolCallId,
							status: msg.status,
							updates: msg.updates,
							read,
						});
					}

					// Check if all tools are completed and show processing message
					if (msg.status === 'completed') {
						const hasRunningTools = messages.some(
							(m) => m.type === 'tool' && m.status === 'running',
						);
						if (!hasRunningTools) {
							// All tools completed, show processing results message
							assistantThinkingMessage.value = locale.baseText(
								'aiAssistant.thinkingSteps.processingResults',
							);
						}
					}
				}
			}
		});
		console.log('🚀 ~ addAssistantMessages ~ messages:', messages);
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

		const payload: ChatRequest.InitBuilderChat = {
			role: 'user',
			type: 'init-builder-chat',
			user: {
				firstName: usersStore.currentUser?.firstName ?? '',
			},
			question: userMessage,
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
				(msg) => onEachStreamingMessage(msg, id),
				() => onDoneStreaming(),
				(e) => handleServiceError(e, id, retry),
			);
		} catch (e: unknown) {
			handleServiceError(e, id, retry);
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
	};
});
