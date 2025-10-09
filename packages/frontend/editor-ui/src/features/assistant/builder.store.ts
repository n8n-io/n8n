import type { VIEWS } from '@/constants';
import {
	DEFAULT_NEW_WORKFLOW_NAME,
	WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT,
	WORKFLOW_BUILDER_RELEASE_EXPERIMENT,
	EDITABLE_CANVAS_VIEWS,
} from '@/constants';
import { BUILDER_ENABLED_VIEWS } from './constants';
import { STORES } from '@n8n/stores';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { isToolMessage, isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useSettingsStore } from '@/stores/settings.store';
import { assert } from '@n8n/utils/assert';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePostHog } from '@/stores/posthog.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useBuilderMessages } from '@/composables/useBuilderMessages';
import { chatWithBuilder, getAiSessions, getBuilderCredits } from '@/api/ai';
import { generateMessageId, createBuilderPayload } from '@/helpers/builderHelpers';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import pick from 'lodash/pick';
import { jsonParse } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { injectWorkflowState } from '@/composables/useWorkflowState';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { getAuthTypeForNodeCredential, getMainAuthField } from '@/utils/nodeTypesUtils';
import { stringSizeInBytes } from '@/utils/typesUtils';
import { useChatPanelStateStore } from './chatPanelState.store';

const INFINITE_CREDITS = -1;
export const ENABLED_VIEWS = BUILDER_ENABLED_VIEWS;

export const useBuilderStore = defineStore(STORES.BUILDER, () => {
	// Core state
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const streaming = ref<boolean>(false);
	const assistantThinkingMessage = ref<string | undefined>();
	const streamingAbortController = ref<AbortController | null>(null);
	const initialGeneration = ref<boolean>(false);
	const creditsQuota = ref<number | undefined>();
	const creditsClaimed = ref<number | undefined>();

	// Store dependencies
	const chatPanelStateStore = useChatPanelStateStore();
	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();

	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();

	// Composables
	const {
		processAssistantMessages,
		createUserMessage,
		createAssistantMessage,
		createErrorMessage,
		clearMessages,
		mapAssistantMessageToUI,
		clearRatingLogic,
		getRunningTools,
	} = useBuilderMessages();

	// Computed properties
	const isAssistantEnabled = computed(() => settings.isAiAssistantEnabled);

	const trackingSessionId = computed(() => rootStore.pushRef);

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

	const isAssistantOpen = computed(
		() =>
			canShowAssistant.value &&
			chatPanelStateStore.isOpen &&
			chatPanelStateStore.activeMode === 'builder',
	);

	const isAIBuilderEnabled = computed(() => {
		// Check license first
		if (!settings.isAiBuilderEnabled) {
			return false;
		}

		const releaseExperimentVariant = posthogStore.getVariant(
			WORKFLOW_BUILDER_RELEASE_EXPERIMENT.name,
		);
		if (releaseExperimentVariant === WORKFLOW_BUILDER_RELEASE_EXPERIMENT.variant) {
			return true;
		}

		return (
			posthogStore.getVariant(WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT.name) ===
			WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT.variant
		);
	});

	const toolMessages = computed(() => chatMessages.value.filter(isToolMessage));

	const workflowMessages = computed(() => chatMessages.value.filter(isWorkflowUpdatedMessage));

	const assistantMessages = computed(() =>
		chatMessages.value.filter((msg) => msg.role === 'assistant'),
	);

	const creditsRemaining = computed(() => {
		if (
			// can be undefined when first loading or if on deprecated builder experiment
			creditsClaimed.value === undefined ||
			creditsQuota.value === undefined ||
			// Can be the case if not using proxy service
			creditsQuota.value === INFINITE_CREDITS
		) {
			return undefined;
		}

		// some edge cases could lead to claimed being higher than quota
		const remaining = creditsQuota.value - creditsClaimed.value;
		return remaining > 0 ? remaining : 0;
	});

	const hasNoCreditsRemaining = computed(() => {
		return creditsRemaining.value !== undefined ? creditsRemaining.value === 0 : false;
	});

	// Chat management functions
	/**
	 * Resets the entire chat session to initial state.
	 * Called when user navigates away from workflow or explicitly requests a new workflow.
	 * Note: Does not persist the cleared state - sessions can still be reloaded via loadSessions().
	 */
	function resetBuilderChat() {
		chatMessages.value = clearMessages();
		assistantThinkingMessage.value = undefined;
		initialGeneration.value = false;
	}

	// Message handling functions
	function addLoadingAssistantMessage(message: string) {
		assistantThinkingMessage.value = message;
	}

	function stopStreaming() {
		streaming.value = false;
		if (streamingAbortController.value) {
			streamingAbortController.value.abort();
			streamingAbortController.value = null;
		}
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

		if (e.name === 'AbortError') {
			// Handle abort errors as they are expected when stopping streaming
			const userMsg = createAssistantMessage(
				locale.baseText('aiAssistant.builder.streamAbortedMessage'),
				'aborted-streaming',
			);
			chatMessages.value = [...chatMessages.value, userMsg];
			return;
		}

		const errorMessage = createErrorMessage(
			locale.baseText('aiAssistant.serviceError.message', { interpolate: { message: e.message } }),
			id,
			retry,
		);

		chatMessages.value = [...chatMessages.value, errorMessage];

		telemetry.track('Workflow generation errored', {
			error: e.message,
			session_id: trackingSessionId.value,
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
		chatMessages.value = clearRatingLogic([...chatMessages.value, userMsg]);
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
		initialGeneration?: boolean;
		type?: 'message' | 'execution';
		errorMessage?: string;
		errorNodeType?: string;
		executionStatus?: string;
	}) {
		if (streaming.value) {
			return;
		}

		const {
			text,
			source = 'chat',
			quickReplyType,
			errorMessage,
			type = 'message',
			errorNodeType,
			executionStatus,
		} = options;

		// Set initial generation flag if provided
		if (options.initialGeneration !== undefined) {
			initialGeneration.value = options.initialGeneration;
		}
		const messageId = generateMessageId();

		const currentWorkflowJson = getWorkflowSnapshot();
		const trackingPayload: Record<string, string> = {
			source,
			message: text,
			session_id: trackingSessionId.value,
			start_workflow_json: currentWorkflowJson,
			workflow_id: workflowsStore.workflowId,
			type,
		};

		if (type === 'execution') {
			let resultData = '{}';
			let resultDataSizeKb = 0;

			try {
				resultData = JSON.stringify(workflowsStore.workflowExecutionData ?? {});
				resultDataSizeKb = stringSizeInBytes(resultData) / 1024;
			} catch (error) {
				// Handle circular structure errors gracefully
				console.warn('Failed to stringify execution data for telemetry:', error);
			}

			trackingPayload.execution_data = resultDataSizeKb > 512 ? '{}' : resultData;
			trackingPayload.execution_status = executionStatus ?? '';
			if (executionStatus === 'error') {
				trackingPayload.error_message = errorMessage ?? '';
				trackingPayload.error_node_type = errorNodeType ?? '';
			}
		}

		telemetry.track('User submitted builder message', trackingPayload);

		prepareForStreaming(text, messageId);

		const executionResult = workflowsStore.workflowExecutionData?.data?.resultData;
		const payload = createBuilderPayload(text, {
			quickReplyType,
			workflow: workflowsStore.workflow,
			executionData: executionResult,
			nodesForSchema: Object.keys(workflowsStore.nodesByName),
		});

		const retry = createRetryHandler(messageId, async () => sendChatMessage(options));

		// Abort previous streaming request if any
		if (streamingAbortController.value) {
			streamingAbortController.value.abort();
		}

		const useDeprecatedCredentials =
			posthogStore.getVariant(WORKFLOW_BUILDER_RELEASE_EXPERIMENT.name) !==
				WORKFLOW_BUILDER_RELEASE_EXPERIMENT.variant &&
			posthogStore.getVariant(WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT.name) ===
				WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT.variant;

		streamingAbortController.value = new AbortController();
		try {
			chatWithBuilder(
				rootStore.restApiContext,
				{ payload },
				(response) => {
					const result = processAssistantMessages(
						chatMessages.value,
						response.messages,
						generateMessageId(),
						retry,
					);
					chatMessages.value = result.messages;

					if (result.shouldClearThinking) {
						assistantThinkingMessage.value = undefined;
					} else {
						// Always update thinking message, even when undefined (to clear it)
						assistantThinkingMessage.value = result.thinkingMessage;
					}
				},
				() => stopStreaming(),
				(e) => handleServiceError(e, messageId, retry),
				streamingAbortController.value?.signal,
				useDeprecatedCredentials,
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

	function setDefaultNodesCredentials(workflowData: WorkflowDataUpdate) {
		// Set default credentials for new nodes if available
		workflowData.nodes?.forEach((node) => {
			const hasCredentials = node.credentials && Object.keys(node.credentials).length > 0;
			if (hasCredentials) {
				return;
			}

			const nodeType = nodeTypesStore.getNodeType(node.type);
			if (!nodeType?.credentials) {
				return;
			}

			// Try to find and set the first available credential
			for (const credentialConfig of nodeType.credentials) {
				const credentials = credentialsStore.getCredentialsByType(credentialConfig.name);
				// No credentials of this type exist, try the next one
				if (!credentials || credentials.length === 0) {
					continue;
				}

				// Found valid credentials - set them and exit the loop
				const credential = credentials[0];

				node.credentials = {
					[credential.type]: {
						id: credential.id,
						name: credential.name,
					},
				};

				const authField = getMainAuthField(nodeType);
				const authType = getAuthTypeForNodeCredential(nodeType, credentialConfig);
				if (authField && authType) {
					node.parameters[authField.name] = authType.value;
				}

				break; // Exit loop after setting the first valid credential
			}
		});
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
		const { nodePositions, existingNodeIds } = captureCurrentWorkflowState();

		// Clear existing workflow
		workflowState.removeAllConnections({ setStateDirty: false });
		workflowState.removeAllNodes({ setStateDirty: false, removePinData: true });

		// For the initial generation, we want to apply auto-generated workflow name
		// but only if the workflow has default name
		if (
			workflowData.name &&
			initialGeneration.value &&
			workflowsStore.workflow.name.startsWith(DEFAULT_NEW_WORKFLOW_NAME)
		) {
			workflowState.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
		}

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

		setDefaultNodesCredentials(workflowData);

		return {
			success: true,
			workflowData,
			newNodeIds: nodesIdsToTidyUp,
			oldNodeIds: Array.from(existingNodeIds),
		};
	}

	function getWorkflowSnapshot() {
		return JSON.stringify(pick(workflowsStore.workflow, ['nodes', 'connections']));
	}

	function updateBuilderCredits(quota?: number, claimed?: number) {
		creditsQuota.value = quota;
		creditsClaimed.value = claimed;
	}

	async function fetchBuilderCredits() {
		const releaseExperimentVariant = posthogStore.getVariant(
			WORKFLOW_BUILDER_RELEASE_EXPERIMENT.name,
		);
		if (releaseExperimentVariant !== WORKFLOW_BUILDER_RELEASE_EXPERIMENT.variant) {
			return;
		}

		try {
			const response = await getBuilderCredits(rootStore.restApiContext);
			updateBuilderCredits(response.creditsQuota, response.creditsClaimed);
		} catch {
			// Keep default values on error
		}
	}

	// Public API
	return {
		// State
		isAssistantEnabled,
		canShowAssistantButtonsOnCanvas,
		chatMessages,
		streaming,
		isAssistantOpen,
		canShowAssistant,
		assistantThinkingMessage,
		isAIBuilderEnabled,
		workflowPrompt,
		toolMessages,
		workflowMessages,
		assistantMessages,
		trackingSessionId,
		streamingAbortController,
		initialGeneration,
		creditsQuota: computed(() => creditsQuota.value),
		creditsRemaining,
		hasNoCreditsRemaining,

		// Methods
		stopStreaming,
		resetBuilderChat,
		sendChatMessage,
		loadSessions,
		applyWorkflowUpdate,
		getWorkflowSnapshot,
		fetchBuilderCredits,
		updateBuilderCredits,
		getRunningTools,
	};
});
