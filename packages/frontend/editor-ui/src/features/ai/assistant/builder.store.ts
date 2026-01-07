import type { VIEWS } from '@/app/constants';
import { DEFAULT_NEW_WORKFLOW_NAME } from '@/app/constants';
import { BUILDER_ENABLED_VIEWS } from './constants';
import { STORES } from '@n8n/stores';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import { isToolMessage, isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsStore } from '@/app/stores/settings.store';
import { assert } from '@n8n/utils/assert';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBuilderMessages } from './composables/useBuilderMessages';
import {
	chatWithBuilder,
	getAiSessions,
	getBuilderCredits,
	getSessionsMetadata,
	truncateBuilderMessages,
} from '@/features/ai/assistant/assistant.api';
import {
	generateMessageId,
	createBuilderPayload,
	extractRevertVersionIds,
	fetchExistingVersionIds,
	enrichMessagesWithRevertVersion,
} from './builder.utils';
import { useBuilderTodos, type TodosTrackingPayload } from './composables/useBuilderTodos';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import pick from 'lodash/pick';
import { type INodeExecutionData, type ITelemetryTrackProperties, jsonParse } from 'n8n-workflow';
import { useToast } from '@/app/composables/useToast';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { getAuthTypeForNodeCredential, getMainAuthField } from '@/app/utils/nodeTypesUtils';
import { stringSizeInBytes } from '@/app/utils/typesUtils';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { dedupe } from 'n8n-workflow';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useUIStore } from '@/app/stores/ui.store';

const INFINITE_CREDITS = -1;
export const ENABLED_VIEWS = BUILDER_ENABLED_VIEWS;

/**
 * Event types for the Workflow builder journey telemetry event
 */
export type WorkflowBuilderJourneyEventType =
	| 'user_clicked_todo'
	| 'field_focus_placeholder_in_ndv'
	| 'no_placeholder_values_left'
	| 'revert_version_from_builder';

interface WorkflowBuilderJourneyEventProperties {
	node_type?: string;
	type?: string;
	revert_user_message_id?: string;
	revert_version_id?: string;
	no_versions_reverted?: number;
}

interface WorkflowBuilderJourneyPayload extends ITelemetryTrackProperties {
	workflow_id: string;
	session_id: string;
	event_type: WorkflowBuilderJourneyEventType;
	event_properties?: WorkflowBuilderJourneyEventProperties;
	last_user_message_id?: string;
}

interface EndOfStreamingTrackingPayload {
	userMessageId: string;
	startWorkflowJson: string;
}

interface UserSubmittedBuilderMessageTrackingPayload
	extends ITelemetryTrackProperties,
		TodosTrackingPayload {
	source: 'chat' | 'canvas';
	message: string;
	session_id: string;
	start_workflow_json: string;
	workflow_id: string;
	type: 'message' | 'execution';
	manual_exec_success_count_since_prev_msg: number;
	manual_exec_error_count_since_prev_msg: number;
	user_message_id: string;
	execution_data?: string;
	execution_status?: string;
	error_message?: string;
	error_node_type?: string;
}

export const useBuilderStore = defineStore(STORES.BUILDER, () => {
	// Core state
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const streaming = ref<boolean>(false);
	const builderThinkingMessage = ref<string | undefined>();
	const streamingAbortController = ref<AbortController | null>(null);
	const initialGeneration = ref<boolean>(false);
	const creditsQuota = ref<number | undefined>();
	const creditsClaimed = ref<number | undefined>();
	const hasMessages = ref<boolean>(false);
	const manualExecStatsInBetweenMessages = ref<{ success: number; error: number }>({
		success: 0,
		error: 0,
	});

	// Track whether AI Builder made edits since last save (resets after each save)
	const aiBuilderMadeEdits = ref(false);

	const currentStreamingMessage = ref<EndOfStreamingTrackingPayload | undefined>();

	// Track the last user message ID for telemetry
	const lastUserMessageId = ref<string | undefined>();

	// Store dependencies
	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const ndvStore = useNDVStore();
	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const uiStore = useUIStore();
	const router = useRouter();
	const workflowSaver = useWorkflowSaving({ router });

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

	const { workflowTodos, getTodosToTrack } = useBuilderTodos();

	const trackingSessionId = computed(() => rootStore.pushRef);

	const workflowPrompt = computed(() => {
		const firstUserMessage = chatMessages.value.find(
			(msg) => msg.role === 'user' && msg.type === 'text',
		) as ChatUI.TextMessage;

		return firstUserMessage?.content;
	});

	const isAIBuilderEnabled = computed((): boolean => {
		return settings.isAiBuilderEnabled;
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
		builderThinkingMessage.value = undefined;
		initialGeneration.value = false;
		lastUserMessageId.value = undefined;
	}

	function incrementManualExecutionStats(type: 'success' | 'error') {
		manualExecStatsInBetweenMessages.value[type]++;
	}

	function resetManualExecutionStats() {
		manualExecStatsInBetweenMessages.value = {
			success: 0,
			error: 0,
		};
	}

	// Message handling functions
	function addLoadingAssistantMessage(message: string) {
		builderThinkingMessage.value = message;
	}

	function getWorkflowModifications({
		userMessageId,
		startWorkflowJson,
	}: EndOfStreamingTrackingPayload) {
		const newToolMessages = toolMessages.value.filter((toolMsg) =>
			toolMsg.id?.startsWith(userMessageId),
		);
		const endWorkflowJson = getWorkflowSnapshot();

		return {
			tools_called: dedupe(newToolMessages.map((toolMsg) => toolMsg.toolName)),
			start_workflow_json: startWorkflowJson,
			end_workflow_json: endWorkflowJson,
			workflow_modified: endWorkflowJson !== startWorkflowJson,
		};
	}

	type StopStreamingPayload =
		| {
				error: string;
		  }
		| { aborted: true };
	function trackEndBuilderResponse(payload?: StopStreamingPayload) {
		if (!currentStreamingMessage.value) {
			return;
		}

		const { userMessageId } = currentStreamingMessage.value;

		telemetry.track('End of response from builder', {
			user_message_id: userMessageId,
			workflow_id: workflowsStore.workflowId,
			session_id: trackingSessionId.value,
			...getWorkflowModifications(currentStreamingMessage.value),
			...payload,
			...getTodosToTrack(),
		});
	}

	function stopStreaming(payload?: StopStreamingPayload) {
		streaming.value = false;
		if (streamingAbortController.value) {
			streamingAbortController.value.abort();
			streamingAbortController.value = null;
		}

		trackEndBuilderResponse(payload);
		currentStreamingMessage.value = undefined;
	}

	function abortStreaming() {
		stopStreaming({ aborted: true });
	}

	// Error handling
	/**
	 * Handles streaming errors by creating an error message with optional retry capability.
	 * Cleans up streaming state and removes the thinking indicator.
	 * The retry function, if provided, will remove the error message before retrying.
	 * Tracks error telemetry
	 */
	function handleServiceError(e: unknown, userMessageId: string, retry?: () => Promise<void>) {
		assert(e instanceof Error);

		stopStreaming({
			error: e.message,
		});
		builderThinkingMessage.value = undefined;

		// Remove tools that were still running when error occurred
		const messagesWithoutRunningTools = chatMessages.value.filter(
			(msg) => !(msg.type === 'tool' && msg.status === 'running'),
		);

		if (e.name === 'AbortError') {
			// Handle abort errors as they are expected when stopping streaming
			const userMsg = createAssistantMessage(
				locale.baseText('aiAssistant.builder.streamAbortedMessage'),
				'aborted-streaming',
				{ aborted: true },
			);
			chatMessages.value = [...messagesWithoutRunningTools, userMsg];
			return;
		}

		const errorMessage = createErrorMessage(
			locale.baseText('aiAssistant.serviceError.message', { interpolate: { message: e.message } }),
			userMessageId,
			retry,
		);

		chatMessages.value = [...messagesWithoutRunningTools, errorMessage];
	}

	// Helper functions
	/**
	 * Prepares UI for incoming streaming response.
	 * Adds user message immediately for visual feedback, shows thinking indicator,
	 * and ensures chat is open. Called before initiating API request to minimize
	 * perceived latency.
	 */
	function prepareForStreaming(
		userMessage: string,
		messageId: string,
		revertVersion?: { id: string; createdAt: string },
	) {
		const userMsg = createUserMessage(userMessage, messageId, revertVersion);
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

	// Telemetry functions
	/**
	 * Tracks when a user submits a message to the builder.
	 * Captures workflow state, execution data, and todo counts for analytics.
	 */
	function trackUserSubmittedBuilderMessage(options: {
		text: string;
		source: 'chat' | 'canvas';
		type: 'message' | 'execution';
		userMessageId: string;
		currentWorkflowJson: string;
		errorMessage?: string;
		errorNodeType?: string;
		executionStatus?: string;
	}) {
		const {
			text,
			source,
			type,
			userMessageId,
			currentWorkflowJson,
			errorMessage,
			errorNodeType,
			executionStatus,
		} = options;

		const trackingPayload: UserSubmittedBuilderMessageTrackingPayload = {
			source,
			message: text,
			session_id: trackingSessionId.value,
			start_workflow_json: currentWorkflowJson,
			workflow_id: workflowsStore.workflowId,
			type,
			manual_exec_success_count_since_prev_msg: manualExecStatsInBetweenMessages.value.success,
			manual_exec_error_count_since_prev_msg: manualExecStatsInBetweenMessages.value.error,
			user_message_id: userMessageId,
			...getTodosToTrack(),
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
	}

	/**
	 * Saves the workflow and returns the version info for message history.
	 * For new workflows, creates the workflow first.
	 * For existing workflows, only saves if there are unsaved changes.
	 * Returns the version ID and timestamp after any save operation.
	 */
	async function saveWorkflowAndGetRevertVersion(): Promise<
		{ id: string; createdAt: string } | undefined
	> {
		const isNewWorkflow = workflowsStore.isNewWorkflow;
		const hasUnsavedChanges = uiStore.stateIsDirty;

		// Save if it's a new workflow or has unsaved changes
		if (isNewWorkflow || hasUnsavedChanges) {
			const saved = await workflowSaver.saveCurrentWorkflow();
			if (!saved) {
				throw new Error('Could not save changes');
			}
		}

		const versionId = workflowsStore.workflowVersionId;
		if (!versionId) return undefined;

		// Use workflow updatedAt as version timestamp
		// might not be the same as "version.createdAt" but close enough
		const updatedAt = workflowsStore.workflow.updatedAt;
		return {
			id: versionId,
			createdAt: typeof updatedAt === 'number' ? new Date(updatedAt).toISOString() : updatedAt,
		};
	}

	// Core API functions
	/**
	 * Sends a message to the AI builder service and handles the streaming response.
	 * Prevents concurrent requests by checking streaming state.
	 * Saves workflow first to get versionId for restore functionality.
	 * Captures workflow state before sending for comparison in telemetry.
	 * Creates a retry handler that preserves the original message context.
	 */
	async function sendChatMessage(options: {
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

		let revertVersion;
		try {
			revertVersion = await saveWorkflowAndGetRevertVersion();
		} catch {
			return;
		}

		// Close NDV on new message
		ndvStore.unsetActiveNodeName();

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
		const userMessageId = generateMessageId();
		lastUserMessageId.value = userMessageId;
		const currentWorkflowJson = getWorkflowSnapshot();

		currentStreamingMessage.value = {
			userMessageId,
			startWorkflowJson: currentWorkflowJson,
		};

		trackUserSubmittedBuilderMessage({
			text,
			source,
			type,
			userMessageId,
			currentWorkflowJson,
			errorMessage,
			errorNodeType,
			executionStatus,
		});

		resetManualExecutionStats();

		prepareForStreaming(text, userMessageId, revertVersion);

		const executionResult = workflowsStore.workflowExecutionData?.data?.resultData;
		const payload = createBuilderPayload(text, userMessageId, {
			quickReplyType,
			workflow: workflowsStore.workflow,
			executionData: executionResult,
			nodesForSchema: Object.keys(workflowsStore.nodesByName),
		});

		const retry = createRetryHandler(userMessageId, async () => await sendChatMessage(options));

		// Abort previous streaming request if any
		if (streamingAbortController.value) {
			streamingAbortController.value.abort();
		}

		streamingAbortController.value = new AbortController();
		try {
			chatWithBuilder(
				rootStore.restApiContext,
				{ payload },
				(response) => {
					const result = processAssistantMessages(
						chatMessages.value,
						response.messages,
						userMessageId,
						retry,
					);
					chatMessages.value = result.messages;

					if (result.shouldClearThinking) {
						builderThinkingMessage.value = undefined;
					} else {
						// Always update thinking message, even when undefined (to clear it)
						builderThinkingMessage.value = result.thinkingMessage;
					}
				},
				() => stopStreaming(),
				(e) => handleServiceError(e, userMessageId, retry),
				revertVersion?.id,
				streamingAbortController.value?.signal,
			);
		} catch (e: unknown) {
			handleServiceError(e, userMessageId, retry);
		}
	}

	/**
	 * Loads the most recent chat session for the current workflow.
	 * Only loads if a workflow ID exists (not for new unsaved workflows).
	 * Replaces current chat messages entirely - does NOT merge with existing messages.
	 * Sessions are ordered by recency, so sessions[0] is always the latest.
	 * Filters out messages with revertVersionId pointing to non-existent versions.
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

				// Extract version IDs and check which still exist
				const versionIds = extractRevertVersionIds(latestSession.messages);
				const versionMap = await fetchExistingVersionIds(
					rootStore.restApiContext,
					workflowId,
					versionIds,
				);

				// Enrich messages with revertVersion objects and convert to UI messages
				const enrichedMessages = enrichMessagesWithRevertVersion(
					latestSession.messages,
					versionMap,
				);
				const convertedMessages = enrichedMessages
					.map((msg) => {
						// Use messageId from backend if available, otherwise generate new one
						const id = 'id' in msg && typeof msg.id === 'string' ? msg.id : generateMessageId();
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
		const pinnedDataByNodeName = new Map<string, INodeExecutionData[]>();

		workflowsStore.allNodes.forEach((node) => {
			nodePositions.set(node.id, [...node.position]);
			existingNodeIds.add(node.id);

			// Capture pinned data by node name
			const pinData = workflowsStore.pinDataByNodeName(node.name);
			if (pinData) {
				pinnedDataByNodeName.set(node.name, pinData);
			}
		});

		return {
			nodePositions,
			existingNodeIds,
			pinnedDataByNodeName,
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

	function clearExistingWorkflow() {
		workflowState.removeAllConnections({ setStateDirty: false });
		workflowState.removeAllNodes({ setStateDirty: false, removePinData: true });
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
		const { nodePositions, existingNodeIds, pinnedDataByNodeName } = captureCurrentWorkflowState();

		clearExistingWorkflow();

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

		// Restore pinned data for nodes with matching names
		const restoredPinData: Record<string, INodeExecutionData[]> = {};
		workflowData.nodes?.forEach((node) => {
			const savedPinData = pinnedDataByNodeName.get(node.name);
			if (savedPinData) {
				restoredPinData[node.name] = savedPinData;
			}
		});

		if (Object.keys(restoredPinData).length > 0) {
			workflowData.pinData = restoredPinData;
		}

		// Mark that AI Builder made edits (will be reset after save)
		aiBuilderMadeEdits.value = true;

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

	/**
	 * Returns true if AI Builder made edits since the last save.
	 * Use resetAiBuilderMadeEdits() after successful save to clear the flag.
	 */
	function getAiBuilderMadeEdits(): boolean {
		return aiBuilderMadeEdits.value;
	}

	/**
	 * Resets the AI Builder edits flag.
	 * Should only be called after a successful workflow save.
	 */
	function resetAiBuilderMadeEdits(): void {
		aiBuilderMadeEdits.value = false;
	}

	function updateBuilderCredits(quota?: number, claimed?: number) {
		creditsQuota.value = quota;
		creditsClaimed.value = claimed;
	}

	async function fetchBuilderCredits() {
		if (!isAIBuilderEnabled.value) {
			return;
		}

		try {
			const response = await getBuilderCredits(rootStore.restApiContext);
			updateBuilderCredits(response.creditsQuota, response.creditsClaimed);
		} catch {
			// Keep default values on error
		}
	}

	async function fetchSessionsMetadata() {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) {
			hasMessages.value = false;
			return;
		}

		try {
			const response = await getSessionsMetadata(rootStore.restApiContext, workflowId);
			hasMessages.value = response.hasMessages;
		} catch (error) {
			console.error('Failed to fetch sessions metadata:', error);
			hasMessages.value = false;
		}
	}

	// Watch workflowId changes to fetch sessions metadata when a valid workflow is loaded
	watch(
		() => workflowsStore.workflowId,
		(newWorkflowId) => {
			// Only fetch if we have a valid workflow ID, AI builder is enabled, and we're in a builder-enabled view
			if (
				newWorkflowId &&
				workflowsStore.isWorkflowSaved[workflowsStore.workflowId] &&
				BUILDER_ENABLED_VIEWS.includes(route.name as VIEWS) &&
				isAIBuilderEnabled.value
			) {
				void fetchSessionsMetadata();
			} else {
				hasMessages.value = false;
			}
		},
	);

	/**
	 * Tracks workflow builder journey events for telemetry
	 * @param eventType - The type of event being tracked
	 * @param eventProperties - Optional event-specific attributes
	 */
	function trackWorkflowBuilderJourney(
		eventType: WorkflowBuilderJourneyEventType,
		eventProperties?: WorkflowBuilderJourneyEventProperties,
	) {
		const payload: WorkflowBuilderJourneyPayload = {
			workflow_id: workflowsStore.workflowId,
			session_id: trackingSessionId.value,
			event_type: eventType,
		};

		if (eventProperties && Object.keys(eventProperties).length > 0) {
			payload.event_properties = eventProperties;
		}

		if (lastUserMessageId.value) {
			payload.last_user_message_id = lastUserMessageId.value;
		}

		telemetry.track('Workflow builder journey', payload);
	}

	// Version management for workflow history
	const workflowHistoryStore = useWorkflowHistoryStore();

	/**
	 * Restores the workflow to a previous version and truncates chat messages.
	 * Finds the user message with the matching messageId and removes it
	 * along with all messages after it.
	 *
	 * @param versionId - The workflow version ID to restore to
	 * @param messageId - The message ID to truncate from
	 */
	async function restoreToVersion(
		versionId: string,
		messageId: string,
	): Promise<IWorkflowDb | undefined> {
		const workflowId = workflowsStore.workflowId;

		// Save current workflow if there are unsaved changes before restoring
		if (uiStore.stateIsDirty) {
			const saved = await workflowSaver.saveCurrentWorkflow();
			if (!saved) {
				// saving errored or user opted not to overwrite changes
				return;
			}
		}

		// 1. Restore the workflow using existing workflow history store
		const updatedWorkflow = await workflowHistoryStore.restoreWorkflow(workflowId, versionId);

		// version id is important to update, because otherwise the next time user saves,
		// "overwrite" prevention modal shows, because the version id on the FE would be out of sync with latest on the backend
		workflowState.setWorkflowProperty('versionId', updatedWorkflow.versionId);
		workflowState.setWorkflowProperty('updatedAt', updatedWorkflow.updatedAt);

		// 2. Truncate messages in backend session (removes message with messageId and all after)
		await truncateBuilderMessages(rootStore.restApiContext, workflowId, messageId);

		// 3. Truncate local chat messages - find user message with matching messageId
		// and remove it along with all messages after it
		const msgIndex = chatMessages.value.findIndex((msg) => msg.id === messageId);
		const messagesBeingReverted =
			msgIndex !== -1
				? chatMessages.value
						.slice(msgIndex)
						.filter((msg) => 'revertVersion' in msg && msg.revertVersion).length
				: 0;
		if (msgIndex !== -1) {
			chatMessages.value = chatMessages.value.slice(0, msgIndex);
		}

		// 4. Track telemetry event for version restore
		trackWorkflowBuilderJourney('revert_version_from_builder', {
			revert_user_message_id: messageId,
			revert_version_id: versionId,
			no_versions_reverted: messagesBeingReverted,
		});

		return updatedWorkflow;
	}

	// Public API
	return {
		// State
		chatMessages,
		streaming,
		builderThinkingMessage,
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
		hasMessages: computed(() => hasMessages.value),
		workflowTodos,

		// Methods
		abortStreaming,
		resetBuilderChat,
		sendChatMessage,
		loadSessions,
		applyWorkflowUpdate,
		getWorkflowSnapshot,
		fetchBuilderCredits,
		updateBuilderCredits,
		getRunningTools,
		fetchSessionsMetadata,
		trackWorkflowBuilderJourney,
		getAiBuilderMadeEdits,
		resetAiBuilderMadeEdits,
		incrementManualExecutionStats,
		resetManualExecutionStats,
		// Version management
		restoreToVersion,
		clearExistingWorkflow,
	};
});
