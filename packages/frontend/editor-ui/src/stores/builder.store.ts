import type { VIEWS } from '@/constants';
import {
	ASK_AI_SLIDE_OUT_DURATION_MS,
	EDITABLE_CANVAS_VIEWS,
	WORKFLOW_BUILDER_EXPERIMENT,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { isToolMessage, isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSettingsStore } from './settings.store';
import { assert } from '@n8n/utils/assert';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useUIStore } from './ui.store';
import { usePostHog } from './posthog.store';
import { DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH, MIN_CHAT_WIDTH } from './assistant.store';
import { useWorkflowsStore } from './workflows.store';
import { useBuilderMessages } from '@/composables/useBuilderMessages';
import { chatWithBuilder, getAiSessions } from '@/api/ai';
import { generateMessageId, createBuilderPayload } from '@/helpers/builderHelpers';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import pick from 'lodash/pick';
import { jsonParse } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';

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
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();

	// Composables
	const {
		processAssistantMessages,
		createUserMessage,
		createErrorMessage,
		clearMessages,
		mapAssistantMessageToUI,
	} = useBuilderMessages();

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

	const toolMessages = computed(() => chatMessages.value.filter(isToolMessage));

	const workflowMessages = computed(() => chatMessages.value.filter(isWorkflowUpdatedMessage));

	// Chat management functions
	/**
	 * Resets the entire chat session to initial state.
	 * Called when user navigates away from workflow or explicitly requests a new workflow.
	 * Note: Does not persist the cleared state - sessions can still be reloaded via loadSessions().
	 */
	function resetBuilderChat() {
		chatMessages.value = clearMessages();
		assistantThinkingMessage.value = undefined;
	}

	/**
	 * Opens the chat panel and adjusts the canvas viewport to make room.
	 */
	async function openChat() {
		chatWindowOpen.value = true;
		chatMessages.value = [];
		uiStore.appGridDimensions = {
			...uiStore.appGridDimensions,
			width: window.innerWidth - chatWidth.value,
		};
		await loadSessions();
	}

	/**
	 * Closes the chat panel with a delayed viewport restoration.
	 * The delay (ASK_AI_SLIDE_OUT_DURATION_MS + 50ms) ensures the slide-out animation
	 * completes before expanding the canvas, preventing visual jarring.
	 * Messages remain in memory.
	 */
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

	/**
	 * Updates chat panel width with enforced boundaries.
	 * Width is clamped between MIN_CHAT_WIDTH (330px) and MAX_CHAT_WIDTH (650px)
	 * to ensure usability on various screen sizes.
	 */
	function updateWindowWidth(width: number) {
		chatWidth.value = Math.min(Math.max(width, MIN_CHAT_WIDTH), MAX_CHAT_WIDTH);
	}

	// Message handling functions
	function addLoadingAssistantMessage(message: string) {
		assistantThinkingMessage.value = message;
	}

	function stopStreaming() {
		streaming.value = false;
	}

	// Error handling
	/**
	 * Handles streaming errors by creating an error message with optional retry capability.
	 * Cleans up streaming state and removes the thinking indicator.
	 * The retry function, if provided, will remove the error message before retrying.
	 * Tracks error telemetry
	 */
	function handleServiceError(e: unknown, id: string, retry?: () => Promise<void>) {
		assert(e instanceof Error);

		stopStreaming();
		assistantThinkingMessage.value = undefined;

		const errorMessage = createErrorMessage(
			locale.baseText('aiAssistant.serviceError.message', { interpolate: { message: e.message } }),
			id,
			retry,
		);
		chatMessages.value = [...chatMessages.value, errorMessage];

		telemetry.track('Workflow generation errored', {
			error: e.message,
			workflow_id: workflowsStore.workflowId,
		});
	}

	// Helper functions
	/**
	 * Prepares UI for incoming streaming response.
	 * Adds user message immediately for visual feedback, shows thinking indicator,
	 * and ensures chat is open. Called before initiating API request to minimize
	 * perceived latency.
	 */
	function prepareForStreaming(userMessage: string, messageId: string) {
		const userMsg = createUserMessage(userMessage, messageId);
		chatMessages.value = [...chatMessages.value, userMsg];
		addLoadingAssistantMessage(locale.baseText('aiAssistant.thinkingSteps.thinking'));
		streaming.value = true;
	}

	/**
	 * Creates a retry function that removes the associated error message before retrying.
	 * This ensures the chat doesn't accumulate multiple error messages for the same failure.
	 * The messageId parameter refers to the error message to remove, not the original user message.
	 */
	function createRetryHandler(messageId: string, retryFn: () => Promise<void>) {
		return async () => {
			// Remove the error message before retrying
			chatMessages.value = chatMessages.value.filter((msg) => msg.id !== messageId);
			await retryFn();
		};
	}

	// Core API functions
	/**
	 * Sends a message to the AI builder service and handles the streaming response.
	 * Prevents concurrent requests by checking streaming state.
	 * Captures workflow state before sending for comparison in telemetry.
	 * Creates a retry handler that preserves the original message context.
	 * Note: This function is NOT async - streaming happens via callbacks.
	 */
	function sendChatMessage(options: {
		text: string;
		source?: 'chat' | 'canvas';
		quickReplyType?: string;
	}) {
		if (streaming.value) {
			return;
		}

		const { text, source = 'chat', quickReplyType } = options;
		const messageId = generateMessageId();

		const currentWorkflowJson = getWorkflowSnapshot();
		telemetry.track('User submitted builder message', {
			source,
			message: text,
			start_workflow_json: currentWorkflowJson,
			workflow_id: workflowsStore.workflowId,
		});

		prepareForStreaming(text, messageId);

		const executionResult = workflowsStore.workflowExecutionData?.data?.resultData;
		const payload = createBuilderPayload(text, {
			quickReplyType,
			workflow: workflowsStore.workflow,
			executionData: executionResult,
			nodesForSchema: Object.keys(workflowsStore.nodesByName),
		});
		const retry = createRetryHandler(messageId, async () => sendChatMessage(options));

		try {
			chatWithBuilder(
				rootStore.restApiContext,
				{ payload },
				(response) => {
					const result = processAssistantMessages(
						chatMessages.value,
						response.messages,
						generateMessageId(),
					);
					chatMessages.value = result.messages;

					if (result.shouldClearThinking) {
						assistantThinkingMessage.value = undefined;
					}

					if (result.thinkingMessage) {
						assistantThinkingMessage.value = result.thinkingMessage;
					}
				},
				() => stopStreaming(),
				(e) => handleServiceError(e, messageId, retry),
			);
		} catch (e: unknown) {
			handleServiceError(e, messageId, retry);
		}
	}

	/**
	 * Loads the most recent chat session for the current workflow.
	 * Only loads if a workflow ID exists (not for new unsaved workflows).
	 * Replaces current chat messages entirely - does NOT merge with existing messages.
	 * Sessions are ordered by recency, so sessions[0] is always the latest.
	 * Silently fails and returns empty array on error to prevent UI disruption.
	 */
	async function loadSessions() {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) {
			return [];
		}

		try {
			const response = await getAiSessions(rootStore.restApiContext, workflowId);
			const sessions = response.sessions || [];

			// Load the most recent session if available
			if (sessions.length > 0) {
				const latestSession = sessions[0];

				// Clear existing messages
				chatMessages.value = clearMessages();

				// Convert and add messages from the session
				const convertedMessages = latestSession.messages
					.map((msg) => {
						const id = generateMessageId();
						return mapAssistantMessageToUI(msg, id);
					})
					// Do not include wf updated messages from session
					.filter((msg) => msg.type !== 'workflow-updated');

				chatMessages.value = convertedMessages;
			}

			return sessions;
		} catch (error) {
			console.error('Failed to load AI sessions:', error);
			return [];
		}
	}

	function captureCurrentWorkflowState() {
		const nodePositions = new Map<string, [number, number]>();
		const existingNodeIds = new Set<string>();

		workflowsStore.allNodes.forEach((node) => {
			nodePositions.set(node.id, [...node.position]);
			existingNodeIds.add(node.id);
		});

		return {
			nodePositions,
			existingNodeIds,
			currentWorkflowJson: JSON.stringify(pick(workflowsStore.workflow, ['nodes', 'connections'])),
		};
	}

	function applyWorkflowUpdate(workflowJson: string) {
		let workflowData: WorkflowDataUpdate;
		try {
			workflowData = jsonParse<WorkflowDataUpdate>(workflowJson);
		} catch (error) {
			useToast().showMessage({
				type: 'error',
				title: locale.baseText('aiAssistant.builder.workflowParsingError.title'),
				message: locale.baseText('aiAssistant.builder.workflowParsingError.content'),
			});
			return { success: false, error };
		}

		// Capture current state before clearing
		const { nodePositions } = captureCurrentWorkflowState();

		// Clear existing workflow
		workflowsStore.removeAllConnections({ setStateDirty: false });
		workflowsStore.removeAllNodes({ setStateDirty: false, removePinData: true });

		// Restore positions for nodes that still exist and identify new nodes
		const nodesIdsToTidyUp: string[] = [];
		if (workflowData.nodes) {
			workflowData.nodes = workflowData.nodes.map((node) => {
				const savedPosition = nodePositions.get(node.id);
				if (savedPosition) {
					return { ...node, position: savedPosition };
				} else {
					// This is a new node, add it to the tidy up list
					nodesIdsToTidyUp.push(node.id);
				}
				return node;
			});
		}

		return { success: true, workflowData, newNodeIds: nodesIdsToTidyUp };
	}

	function getWorkflowSnapshot() {
		return JSON.stringify(pick(workflowsStore.workflow, ['nodes', 'connections']));
	}

	// Public API
	return {
		// State
		isAssistantEnabled,
		canShowAssistantButtonsOnCanvas,
		chatWidth,
		chatMessages,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		assistantThinkingMessage,
		chatWindowOpen,
		isAIBuilderEnabled,
		workflowPrompt,
		toolMessages,
		workflowMessages,

		// Methods
		updateWindowWidth,
		closeChat,
		openChat,
		resetBuilderChat,
		sendChatMessage,
		loadSessions,
		applyWorkflowUpdate,
		getWorkflowSnapshot,
	};
});
