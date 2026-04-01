import type { VIEWS } from '@/app/constants';
import { CODE_WORKFLOW_BUILDER_EXPERIMENT } from '@/app/constants';
import { BUILDER_ENABLED_VIEWS } from './constants';
import { usePostHog } from '@/app/stores/posthog.store';
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
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useBuilderMessages } from './composables/useBuilderMessages';
import {
	chatWithBuilder,
	clearBuilderSession,
	getAiSessions,
	getBuilderCredits,
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
import pick from 'lodash/pick';
import { type IPinData, type ITelemetryTrackProperties } from 'n8n-workflow';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { stringSizeInBytes } from '@/app/utils/typesUtils';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { dedupe } from 'n8n-workflow';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useUIStore } from '@/app/stores/ui.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useBrowserNotifications } from '@/app/composables/useBrowserNotifications';
import { AI_BUILDER_PLAN_MODE_EXPERIMENT } from '@/app/constants/experiments';
import type { QuickReplyType } from '@n8n/api-types';
import {
	isVersionCardMessage,
	type PlanMode,
	type ChatRequest,
	isPlanModePlanMessage,
	isPlanModeQuestionsMessage,
	isWebFetchApprovalCustomMessage,
	isWebFetchApprovalMessage,
	isToolMessage as isApiToolMessage,
} from '@/features/ai/assistant/assistant.types';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import { useCodeDiff } from '@/features/ai/assistant/composables/useCodeDiff';

const INFINITE_CREDITS = -1;
export const ENABLED_VIEWS = BUILDER_ENABLED_VIEWS;

/** Tool names that indicate the AI modified the workflow (used during session reload) */
const WORKFLOW_MODIFYING_TOOLS = new Set([
	'add_nodes',
	'remove_nodes',
	'connect_nodes',
	'disconnect_nodes',
	'update_node_parameters',
	'generate_workflow',
]);

/**
 * Event types for the Workflow builder journey telemetry event
 */
export type WorkflowBuilderJourneyEventType =
	| 'user_clicked_todo'
	| 'user_clicked_unpin_all'
	| 'field_focus_placeholder_in_ndv'
	| 'no_placeholder_values_left'
	| 'revert_version_from_builder'
	| 'browser_notification_ask_permission'
	| 'browser_notification_accept'
	| 'browser_notification_dismiss'
	| 'browser_generation_done_notified'
	| 'user_switched_builder_mode'
	| 'user_clicked_implement_plan'
	| 'user_opened_review_changes'
	| 'user_closed_review_changes'
	| 'user_expanded_review_changes'
	| 'user_collapsed_review_changes'
	| 'setup_wizard_shown'
	| 'setup_wizard_step_navigated'
	| 'setup_wizard_step_completed'
	| 'setup_wizard_all_complete'
	| 'web_fetch_approval_prompted'
	| 'web_fetch_decision'
	| 'web_fetch_completed'
	| 'qa_question_answered'
	| 'qa_question_skipped'
	| 'qa_answers_submitted'
	| 'user_clicked_run_with_test_data'
	| 'user_clicked_configure_own';

interface WorkflowBuilderJourneyEventProperties {
	node_type?: string;
	type?: string;
	count?: number;
	source?: string;
	revert_user_message_id?: string;
	revert_version_id?: string;
	no_versions_reverted?: number;
	completion_type?: 'workflow-ready' | 'input-needed';
	mode?: 'plan' | 'build';
	step?: number;
	total?: number;
	direction?: 'next' | 'prev';
	domain?: string;
	url?: string;
	decision?: 'allow_once' | 'allow_domain' | 'allow_all' | 'deny';
	status?: string;
	question_type?: 'single' | 'multi' | 'text';
	question_index?: number;
	total_questions?: number;
	input_method?: 'click' | 'keyboard_number' | 'keyboard_enter';
	custom_answer_used?: boolean;
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
	revertVersion?: { id: string; createdAt: string };
	planApproved?: boolean;
}

interface UserSubmittedBuilderMessageTrackingPayload
	extends ITelemetryTrackProperties,
		TodosTrackingPayload {
	source: 'chat' | 'canvas' | 'empty-state';
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
	code_builder?: boolean;
	mode?: 'plan' | 'build';
}

export const useBuilderStore = defineStore(STORES.BUILDER, () => {
	// Core state
	const chatMessages = ref<ChatUI.AssistantMessage[]>([]);
	const streaming = ref<boolean>(false);
	// Track whether the current streaming is for a help question (not a build)
	const isHelpStreaming = ref<boolean>(false);
	const builderThinkingMessage = ref<string | undefined>();
	const streamingAbortController = ref<AbortController | null>(null);
	const initialGeneration = ref<boolean>(false);
	const builderMode = ref<'build' | 'plan'>('build');
	const creditsQuota = ref<number | undefined>();
	const creditsClaimed = ref<number | undefined>();
	const manualExecStatsInBetweenMessages = ref<{ success: number; error: number }>({
		success: 0,
		error: 0,
	});

	// Version restore state — persisted to DB via workflow_builder_session
	const activeVersionCardId = ref<string | undefined>(undefined);
	const resumeAfterRestoreMessageId = ref<string | undefined>(undefined);

	/** IDs of messages that should be collapsed (between restore point and resume point) */
	const collapsedMessageIds = computed<Set<string>>(() => {
		if (!activeVersionCardId.value) return new Set();
		const activeIdx = chatMessages.value.findIndex((m) => m.id === activeVersionCardId.value);
		if (activeIdx === -1) return new Set();

		// If the active card is the last version card, nothing to collapse —
		// messages after the latest version are the current conversation.
		const cards = versionCardMessages.value;
		if (cards.length > 0 && cards[cards.length - 1].id === activeVersionCardId.value) {
			return new Set();
		}

		let endIdx = chatMessages.value.length;
		if (resumeAfterRestoreMessageId.value) {
			const resumeIdx = chatMessages.value.findIndex(
				(m) => m.id === resumeAfterRestoreMessageId.value,
			);
			if (resumeIdx !== -1) endIdx = resumeIdx;
		}

		return new Set(
			chatMessages.value
				.slice(activeIdx + 1, endIdx)
				.map((m) => m.id)
				.filter(Boolean) as string[],
		);
	});

	// Track whether any successful execution (full workflow or per-node) has occurred in this session
	const hasHadSuccessfulExecution = ref(false);

	// AI-generated test data — persists throughout the session for apply/re-apply
	const generatedPinData = ref<IPinData | null>(null);

	// Whether the generated pin data has been applied to workflow nodes
	const pinDataApplied = ref(false);

	// Setup wizard state
	const wizardCurrentStep = ref(0);
	const wizardClearedPlaceholders = ref(new Set<string>());
	const wizardHasExecutedWorkflow = ref(false);

	function resetWizardState() {
		wizardCurrentStep.value = 0;
		wizardClearedPlaceholders.value.clear();
		wizardHasExecutedWorkflow.value = false;
	}

	// Track whether AI Builder made edits since last save (resets after each save)
	const aiBuilderMadeEdits = ref(false);

	const currentStreamingMessage = ref<EndOfStreamingTrackingPayload | undefined>();

	// Track the last user message ID for telemetry
	const lastUserMessageId = ref<string | undefined>();

	// Track whether loadSessions is in progress to prevent duplicate calls
	const isLoadingSessions = ref(false);

	// Track the workflowId for which sessions have been loaded (or attempted)
	// to prevent redundant API calls when no session exists
	const loadedSessionsForWorkflowId = ref<string | undefined>();

	const documentTitle = useDocumentTitle();

	// Store dependencies
	const settings = useSettingsStore();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		workflowsStore.workflowId
			? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
			: undefined,
	);
	const workflowState = injectWorkflowState();
	const ndvStore = useNDVStore();
	const route = useRoute();
	const locale = useI18n();
	const telemetry = useTelemetry();
	const uiStore = useUIStore();
	const router = useRouter();
	const workflowSaver = useWorkflowSaving({ router });
	const posthogStore = usePostHog();
	const focusedNodesStore = useFocusedNodesStore();

	// Composables
	const {
		processAssistantMessages,
		createUserMessage,
		createUserAnswersMessage,
		createAssistantMessage,
		createErrorMessage,
		clearMessages,
		mapAssistantMessageToUI,
		clearRatingLogic,
		getRunningTools,
	} = useBuilderMessages();

	const { workflowTodos, getTodosToTrack, hasTodosHiddenByPinnedData } = useBuilderTodos();

	const { applyCodeDiff, undoCodeDiff } = useCodeDiff({
		chatMessages,
		getTargetNodeName: (msg) =>
			msg.nodeName ??
			ndvStore.activeNodeName ??
			focusedNodesStore.confirmedNodes[0]?.nodeName ??
			'',
		getSessionId: (msg) => {
			const id = msg.sdkSessionId;
			assert(id, 'No SDK session ID for code diff');
			return id;
		},
	});

	const trackingSessionId = computed(() => rootStore.pushRef);

	/** Whether the code-builder experiment is enabled for this user */
	const isCodeBuilder = computed(() => {
		const variant = posthogStore.getVariant(CODE_WORKFLOW_BUILDER_EXPERIMENT.name);
		return (
			variant === CODE_WORKFLOW_BUILDER_EXPERIMENT.codeNoPinData ||
			variant === CODE_WORKFLOW_BUILDER_EXPERIMENT.codePinData
		);
	});

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

	const creditsPercentageRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsQuota.value === INFINITE_CREDITS ||
			creditsRemaining.value === undefined
		) {
			return undefined;
		}
		if (creditsQuota.value === 0) return 0;
		return (creditsRemaining.value / creditsQuota.value) * 100;
	});

	const isLowCredits = computed(() => {
		return creditsPercentageRemaining.value !== undefined && creditsPercentageRemaining.value <= 10;
	});

	const hasMessages = computed(() => chatMessages.value.length > 0);

	/** All version card messages in chat order */
	const versionCardMessages = computed(() => chatMessages.value.filter(isVersionCardMessage));

	const latestRevertVersion = computed(() => {
		const cards = versionCardMessages.value;
		if (cards.length === 0) return null;
		const last = cards[cards.length - 1];
		return { id: last.data.versionId, createdAt: last.data.createdAt };
	});

	const isPlanModeAvailable = computed(() => {
		const variant = posthogStore.getVariant(AI_BUILDER_PLAN_MODE_EXPERIMENT.name);
		return variant === true || variant === AI_BUILDER_PLAN_MODE_EXPERIMENT.variant;
	});

	/**
	 * Finds the last interrupt message (questions or plan) by searching backwards.
	 * This is more robust than checking only the last message, because error messages
	 * or other messages can be appended after an interrupt.
	 */
	const pendingInterruptMessage = computed(() => {
		for (let i = chatMessages.value.length - 1; i >= 0; i--) {
			const msg = chatMessages.value[i];
			if (
				isPlanModeQuestionsMessage(msg) ||
				isPlanModePlanMessage(msg) ||
				isWebFetchApprovalCustomMessage(msg)
			) {
				return msg;
			}
			// Stop searching if we hit a user message — any interrupt before that is already resolved
			if (msg.role === 'user') break;
		}
		return null;
	});

	const isInterrupted = computed(() => pendingInterruptMessage.value !== null);

	/**
	 * True when there's a pending plan awaiting user decision.
	 * Unlike questions, users can still type in chat when a plan is pending.
	 */
	const hasPendingPlan = computed(() => {
		const msg = pendingInterruptMessage.value;
		return msg ? isPlanModePlanMessage(msg) : false;
	});

	/**
	 * True when chat input should be disabled.
	 * Only questions require disabling input (user must answer via UI).
	 * Plans allow chat input (typing a message means modifying the plan).
	 */
	const shouldDisableChatInput = computed(() => {
		const msg = pendingInterruptMessage.value;
		if (!msg) return false;
		return isPlanModeQuestionsMessage(msg) || isWebFetchApprovalCustomMessage(msg);
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
		loadedSessionsForWorkflowId.value = undefined;
		hasHadSuccessfulExecution.value = false;
		generatedPinData.value = null;
		pinDataApplied.value = false;
		builderMode.value = 'build';
		resetWizardState();
	}

	/**
	 * Explicitly clear the backend session for the current workflow.
	 * Only called when the user explicitly requests a clear (e.g. /clear command).
	 * This deletes persisted messages so they won't be reloaded on next visit.
	 */
	function clearBackendSession() {
		const workflowId = workflowsStore.workflowId;
		if (workflowId) {
			void clearBuilderSession(rootStore.restApiContext, workflowId);
		}
	}

	function setBuilderMode(mode: 'build' | 'plan') {
		if (mode === 'plan' && !isPlanModeAvailable.value) return;
		builderMode.value = mode;
		trackWorkflowBuilderJourney('user_switched_builder_mode', { mode });
	}

	function incrementManualExecutionStats(type: 'success' | 'error') {
		manualExecStatsInBetweenMessages.value[type]++;
		if (type === 'success') {
			hasHadSuccessfulExecution.value = true;
		}
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

		const { userMessageId, planApproved } = currentStreamingMessage.value;

		telemetry.track('End of response from builder', {
			user_message_id: userMessageId,
			workflow_id: workflowsStore.workflowId,
			session_id: trackingSessionId.value,
			tab_visible: document.visibilityState === 'visible',
			code_builder: isCodeBuilder.value,
			mode: builderMode.value,
			...(planApproved ? { plan_approved: true } : {}),
			...getWorkflowModifications(currentStreamingMessage.value),
			...payload,
			...getTodosToTrack(),
		});
	}

	type CompletionType = 'workflow-ready' | 'input-needed';

	/**
	 * Checks if the current streaming response included a workflow update.
	 * Used to determine whether to show "workflow ready" or "input needed" notification.
	 */
	function hasWorkflowUpdateInCurrentBatch(userMessageId: string): boolean {
		return chatMessages.value.some(
			(msg) => msg.type === 'workflow-updated' && msg.id?.startsWith(userMessageId),
		);
	}

	/**
	 * Shows a browser notification when the AI builder completes.
	 * Only shows if browser notifications are enabled.
	 * Clicking the notification focuses the window and closes it.
	 */
	function notifyOnCompletion(completionType: CompletionType) {
		const { showNotification, isEnabled } = useBrowserNotifications();
		if (!isEnabled.value) {
			return;
		}

		const workflowName = workflowsStore.workflowName;

		const titleKey =
			completionType === 'workflow-ready'
				? 'aiAssistant.builder.notification.title'
				: 'aiAssistant.builder.notification.inputNeeded.title';

		const bodyKey =
			completionType === 'workflow-ready'
				? 'aiAssistant.builder.notification.body'
				: 'aiAssistant.builder.notification.inputNeeded.body';

		const notification = showNotification(locale.baseText(titleKey), {
			body: locale.baseText(bodyKey, {
				interpolate: { workflowName },
			}),
			icon: '/favicon.ico',
			tag: `workflow-build-${workflowsStore.workflowId}`,
			requireInteraction: false,
		});

		if (notification) {
			trackWorkflowBuilderJourney('browser_generation_done_notified', {
				completion_type: completionType,
			});

			notification.onclick = () => {
				window.focus();
				notification.close();
			};
		}
	}

	async function stopStreaming(payload?: StopStreamingPayload) {
		isHelpStreaming.value = false;
		if (streamingAbortController.value) {
			streamingAbortController.value.abort();
			streamingAbortController.value = null;
		}

		trackEndBuilderResponse(payload);

		// Capture state before clearing currentStreamingMessage
		const userMessageId = currentStreamingMessage.value?.userMessageId;
		const { revertVersion } = currentStreamingMessage.value ?? {};
		currentStreamingMessage.value = undefined;

		// Reset wizard state when streaming ends with a workflow update (AI changed the workflow)
		if (userMessageId && hasWorkflowUpdateInCurrentBatch(userMessageId)) {
			resetWizardState();
		}

		// Only show "Restore version" on user messages that triggered a workflow modification.
		// During planning or question phases no workflow changes happen, so skip it.
		// Skip on error/abort paths — the caller handles chatMessages directly and a
		// late-resolving savePostModificationVersion() would race with those writes.
		if (
			!payload &&
			userMessageId &&
			revertVersion &&
			hasWorkflowUpdateInCurrentBatch(userMessageId)
		) {
			// Save the post-modification state to create a new version entry.
			// Falls back to the pre-modification revertVersion if the save fails.
			const postModVersion = await savePostModificationVersion();
			const versionForCard = postModVersion ?? revertVersion;

			chatMessages.value = [
				...chatMessages.value,
				{
					id: `version-card-${userMessageId}`,
					role: 'assistant',
					type: 'custom',
					customType: 'version_card',
					data: {
						versionId: versionForCard.id,
						createdAt: versionForCard.createdAt,
					},
				},
			];
		}

		// Defer clearing the streaming flag until after the version card is appended.
		// All callers use `void stopStreaming()` (fire-and-forget), so if we clear this
		// flag before the async savePostModificationVersion() above, sendChatMessage can
		// push a new user message before the version card, breaking message ordering.
		streaming.value = false;

		const wasAborted = payload && 'aborted' in payload && payload.aborted;

		// Update page title on completion. We show Done when the user is not on the page
		// Browser notifications are only shown when the tab is hidden
		if (document.hidden) {
			documentTitle.setDocumentTitle(workflowsStore.workflowName, 'AI_DONE');
			if (!wasAborted && userMessageId) {
				const completionType = hasWorkflowUpdateInCurrentBatch(userMessageId)
					? 'workflow-ready'
					: 'input-needed';
				notifyOnCompletion(completionType);
			}
		} else {
			documentTitle.setDocumentTitle(workflowsStore.workflowName, 'IDLE');
		}
	}

	function abortStreaming() {
		void stopStreaming({ aborted: true });
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

		void stopStreaming({
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
		focusedNodeNames?: string[],
		planAnswers?: PlanMode.QuestionResponse[],
		skipUserMessage?: boolean,
	) {
		if (!skipUserMessage) {
			const userMsg = planAnswers
				? createUserAnswersMessage(planAnswers, messageId)
				: createUserMessage(userMessage, messageId, undefined, focusedNodeNames ?? []);
			chatMessages.value = clearRatingLogic([...chatMessages.value, userMsg]);
		}
		const thinkingKey =
			userMessage.trim() === '/compact'
				? 'aiAssistant.thinkingSteps.compacting'
				: 'aiAssistant.thinkingSteps.thinking';
		addLoadingAssistantMessage(locale.baseText(thinkingKey));
		streaming.value = true;

		// Updates page title to show AI is building (skip for help questions)
		if (!isHelpStreaming.value) {
			documentTitle.setDocumentTitle(workflowsStore.workflowName, 'AI_BUILDING');
		}
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
		source: 'chat' | 'canvas' | 'empty-state';
		type: 'message' | 'execution';
		userMessageId: string;
		currentWorkflowJson: string;
		errorMessage?: string;
		errorNodeType?: string;
		executionStatus?: string;
		mode?: 'plan' | 'build';
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
			mode,
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
			code_builder: isCodeBuilder.value,
			mode,
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

		const focusedCount = focusedNodesStore.confirmedNodes.length;
		if (focusedCount > 0) {
			const deicticPatterns = /\b(this node|this|it|these nodes|these|that node|that)\b/i;
			const hasDeicticRef = deicticPatterns.test(text);

			telemetry.track('ai.focusedNodes.chatSent', {
				focused_count: focusedCount,
				has_deictic_ref: hasDeicticRef,
			});
		}
	}

	/**
	 * Checks that a versionId has a corresponding workflow history entry.
	 * The backend only creates history entries when nodes/connections change,
	 * so the current versionId may not have one (e.g. initial creation).
	 */
	async function verifyVersionExists(
		versionId: string,
	): Promise<{ id: string; createdAt: string } | undefined> {
		const workflowId = workflowsStore.workflowId;
		const existing = await fetchExistingVersionIds(rootStore.restApiContext, workflowId, [
			versionId,
		]);
		const createdAt = existing.get(versionId);
		return createdAt ? { id: versionId, createdAt } : undefined;
	}

	/**
	 * Saves the workflow and returns the version info for message history.
	 * For new workflows, creates the workflow first.
	 * For existing workflows, only saves if there are unsaved changes.
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
		if (!workflowDocumentStore.value?.updatedAt) return undefined;

		// Verify the versionId actually exists in workflow history.
		// The backend only creates history entries when nodes/connections change,
		// so the current versionId may not have a history entry (e.g., the initial
		// workflow creation doesn't create one). Without a history entry, we can't
		// restore to this version.
		return await verifyVersionExists(versionId);
	}

	/**
	 * Saves the workflow after AI modifications and returns the new version info.
	 * Called after streaming completes to create a post-modification history entry.
	 */
	async function savePostModificationVersion(): Promise<
		{ id: string; createdAt: string } | undefined
	> {
		try {
			const saved = await workflowSaver.saveCurrentWorkflow();
			if (!saved) return undefined;

			const versionId = workflowsStore.workflowVersionId;
			if (!versionId) return undefined;

			return await verifyVersionExists(versionId);
		} catch {
			return undefined;
		}
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
		source?: 'chat' | 'canvas' | 'empty-state';
		quickReplyType?: QuickReplyType;
		initialGeneration?: boolean;
		type?: 'message' | 'execution';
		errorMessage?: string;
		errorNodeType?: string;
		executionStatus?: string;
		resumeData?: unknown;
		mode?: 'build' | 'plan';
		/** Plan mode answers for custom message display */
		planAnswers?: PlanMode.QuestionResponse[];
		/** Whether this is a help question (e.g. credential or error help) that should not lock the canvas */
		helpMessage?: boolean;
		/** When true, skip adding the user message bubble to chat (e.g. web_fetch_approval decisions handled via buttons) */
		skipUserMessage?: boolean;
	}) {
		isHelpStreaming.value = Boolean(options.helpMessage);
		if (streaming.value) {
			return;
		}

		const focusedNodeNames = focusedNodesStore.confirmedNodes.map((n) => n.nodeName);

		// If there's a pending plan and user is sending a chat message (not a resumeData action),
		// automatically treat it as a plan modification request.
		// Avoid mutating the caller's object - reassign to a shallow copy.
		if (hasPendingPlan.value && options.resumeData === undefined) {
			options = { ...options, resumeData: { action: 'modify', feedback: options.text } };
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
			resumeData,
			mode,
		} = options;

		// Set initial generation flag if provided
		if (options.initialGeneration !== undefined) {
			initialGeneration.value = options.initialGeneration;
		}
		const userMessageId = generateMessageId();
		lastUserMessageId.value = userMessageId;

		// If sending a message after a restore, freeze the collapsed range
		if (activeVersionCardId.value && !resumeAfterRestoreMessageId.value) {
			resumeAfterRestoreMessageId.value = userMessageId;
		}

		const currentWorkflowJson = getWorkflowSnapshot();

		const planApproved =
			typeof resumeData === 'object' &&
			resumeData !== null &&
			'action' in resumeData &&
			(resumeData as { action: string }).action === 'approve';

		currentStreamingMessage.value = {
			userMessageId,
			startWorkflowJson: currentWorkflowJson,
			revertVersion,
			...(planApproved ? { planApproved: true } : {}),
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
			mode: builderMode.value,
		});

		resetManualExecutionStats();

		prepareForStreaming(
			text,
			userMessageId,
			focusedNodeNames,
			options.planAnswers,
			options.skipUserMessage,
		);

		const executionResult = workflowsStore.workflowExecutionData?.data?.resultData;
		const modeForPayload =
			resumeData !== undefined
				? mode
				: (mode ?? (builderMode.value === 'plan' ? 'plan' : undefined));
		const payload = await createBuilderPayload(text, userMessageId, {
			workflowId: workflowsStore.workflowId,
			quickReplyType,
			workflow: workflowsStore.workflow,
			executionData: executionResult,
			nodesForSchema: Object.keys(workflowDocumentStore.value?.nodesByName ?? {}),
			mode: modeForPayload,
			isPlanModeEnabled: isPlanModeAvailable.value,
			allowSendingParameterValues: settings.settings.ai.allowSendingParameterValues,
		});
		if (resumeData !== undefined) {
			payload.resumeData = resumeData;
		}

		// Clear confirmed nodes from input now that they've been captured
		// in both the chat UI message and the API payload
		focusedNodesStore.removeAllConfirmed();

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
					if (!isHelpStreaming.value) {
						const hasAssistantToolCall = response.messages.some(
							(msg) => 'toolName' in msg && msg.toolName === 'assistant',
						);
						if (hasAssistantToolCall) {
							isHelpStreaming.value = true;
						}
					}

					const result = processAssistantMessages(
						chatMessages.value,
						response.messages,
						userMessageId,
						retry,
					);
					chatMessages.value = result.messages;

					trackWebFetchEvents(response.messages);

					if (result.shouldClearThinking) {
						builderThinkingMessage.value = undefined;
					} else if (result.thinkingMessage !== undefined) {
						builderThinkingMessage.value = result.thinkingMessage;
					}
					// When thinkingMessage is undefined and no explicit clear: keep current value.
					// This preserves "Thinking" from prepareForStreaming during streaming gaps
					// (e.g., after submitting answers, before first tool call arrives).
				},
				() => {
					void stopStreaming();
				},
				(e) => handleServiceError(e, userMessageId, retry),
				revertVersion?.id,
				streamingAbortController.value?.signal,
			);
		} catch (e: unknown) {
			handleServiceError(e, userMessageId, retry);
		}
	}

	async function resumeWithQuestionsAnswers(answers: PlanMode.QuestionResponse[]) {
		if (!isInterrupted.value) return;

		const text = locale.baseText('aiAssistant.builder.planMode.actions.submitAnswers');
		await sendChatMessage({
			text,
			resumeData: answers,
			planAnswers: answers,
		});
	}

	async function resumeWithPlanDecision(decision: {
		action: 'approve' | 'reject' | 'modify';
		feedback?: string;
	}) {
		if (!isInterrupted.value) return;

		const feedback = decision.feedback?.trim();

		if (decision.action === 'approve') {
			trackWorkflowBuilderJourney('user_clicked_implement_plan');
			await sendChatMessage({
				text: locale.baseText('aiAssistant.builder.planMode.actions.implement'),
				resumeData: decision,
				mode: 'build',
			});
			// Only switch mode after the message is sent successfully
			builderMode.value = 'build';
			return;
		}

		if (decision.action === 'modify') {
			await sendChatMessage({
				text: feedback
					? locale.baseText('aiAssistant.builder.planMode.actions.modifyWithFeedback', {
							interpolate: { feedback },
						})
					: locale.baseText('aiAssistant.builder.planMode.actions.modify'),
				resumeData: decision,
			});
			return;
		}

		await sendChatMessage({
			text: feedback
				? locale.baseText('aiAssistant.builder.planMode.actions.rejectWithFeedback', {
						interpolate: { feedback },
					})
				: locale.baseText('aiAssistant.builder.planMode.actions.reject'),
			resumeData: decision,
		});
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

		// Guard: Don't load if workflow is not saved
		if (!workflowsStore.isWorkflowSaved[workflowId]) {
			return [];
		}

		// Guard: Don't load if already loaded for this workflow (even if empty)
		if (loadedSessionsForWorkflowId.value === workflowId) {
			return [];
		}

		// Guard: Prevent duplicate concurrent calls
		if (isLoadingSessions.value) {
			return [];
		}

		isLoadingSessions.value = true;
		try {
			const response = await getAiSessions(
				rootStore.restApiContext,
				workflowId,
				isCodeBuilder.value,
			);
			loadedSessionsForWorkflowId.value = workflowId;
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

				// Two-pass conversion: first convert all messages, then insert version
				// cards in the correct position.
				// During a live session, stopStreaming() appends version cards AFTER
				// the AI response with the POST-modification version ID. On reload we
				// must reproduce the same ordering and semantics:
				//   user msg → tools → AI response → VERSION CARD → next user msg …
				// The revertVersionId on a user message is the PRE-modification version
				// for that generation. The POST-modification version is the revertVersionId
				// on the NEXT user message (since savePostModificationVersion runs after
				// AI generation, and the next saveWorkflowAndGetRevertVersion captures it).
				// For the last generation, we use the current workflow's versionId.

				// Pass 1: convert messages, stripping revertVersion from user messages
				type ConvertedItem = {
					msg: ChatUI.AssistantMessage;
					versionCard?: ChatUI.AssistantMessage;
				};

				// Pre-scan: collect ordered revertVersionIds from user messages
				// to map each generation to its post-modification version.
				const userMsgRevertIds: string[] = [];
				for (let i = 0; i < latestSession.messages.length; i++) {
					const msg = latestSession.messages[i];
					if ('revertVersionId' in msg && typeof msg.revertVersionId === 'string') {
						userMsgRevertIds.push(msg.revertVersionId);
					}
				}

				// Build post-modification version map and fetch their existence.
				// For generation i, post-mod version = revertVersionId of generation i+1.
				// For the last generation, use the current workflow version.
				const postModVersionIds: string[] = [];
				for (let i = 0; i < userMsgRevertIds.length; i++) {
					if (i < userMsgRevertIds.length - 1) {
						postModVersionIds.push(userMsgRevertIds[i + 1]);
					} else {
						const currentVersionId = workflowsStore.workflowVersionId;
						if (currentVersionId) {
							postModVersionIds.push(currentVersionId);
						}
					}
				}

				// Fetch existence for post-modification version IDs
				const uniquePostModIds = [...new Set(postModVersionIds)].filter(
					(id) => !versionMap.has(id),
				);
				const postModVersionMap =
					uniquePostModIds.length > 0
						? await fetchExistingVersionIds(rootStore.restApiContext, workflowId, uniquePostModIds)
						: new Map<string, string>();

				// Merge both version maps for lookups
				const allVersionMap = new Map([...versionMap, ...postModVersionMap]);

				// Track which revertVersionId we're on to look up the post-mod version
				let revertIdIndex = 0;

				const items: ConvertedItem[] = enrichedMessages.map((raw, idx) => {
					const id = 'id' in raw && typeof raw.id === 'string' ? raw.id : generateMessageId();
					const uiMsg = mapAssistantMessageToUI(raw, id);

					// Use the ORIGINAL raw message to get revertVersionId.
					// enrichMessagesWithRevertVersion strips revertVersionId when the
					// version no longer exists in history (pruned), but we still need
					// to create version cards for those messages.
					const originalMsg = latestSession.messages[idx];
					const revertVersionId =
						'revertVersionId' in originalMsg && typeof originalMsg.revertVersionId === 'string'
							? originalMsg.revertVersionId
							: undefined;

					if (uiMsg.type === 'text' && uiMsg.role === 'user' && revertVersionId) {
						const currentRevertIndex = revertIdIndex;
						revertIdIndex++;

						// Only create a version card if there is a workflow-modifying
						// message in this batch (between this user msg and the next).
						// Plan/question phases have revertVersion but no workflow update.
						// During live streaming, these are 'workflow-updated' messages.
						// In session history from the API, these are tool messages with
						// workflow-modifying tool names (add_nodes, connect_nodes, etc.).
						let hasWorkflowUpdate = false;
						for (let j = idx + 1; j < enrichedMessages.length; j++) {
							const m = enrichedMessages[j];
							if ('role' in m && m.role === 'user') break;
							if ('type' in m && m.type === 'workflow-updated') {
								hasWorkflowUpdate = true;
								break;
							}
							if (isApiToolMessage(m) && WORKFLOW_MODIFYING_TOOLS.has(m.toolName)) {
								hasWorkflowUpdate = true;
								break;
							}
						}

						// Strip revertVersion from the UI message (it's now on the card)
						const { revertVersion: _, ...msgWithoutRevert } = uiMsg;

						// Use post-modification version for the card (next user msg's revertVersionId,
						// or current workflow version for the last generation).
						const postModVersionId = postModVersionIds[currentRevertIndex];
						const postModCreatedAt = postModVersionId
							? allVersionMap.get(postModVersionId)
							: undefined;
						// Fall back to pre-modification version if post-mod is unavailable
						const cardVersionId = postModVersionId ?? revertVersionId;
						const cardCreatedAt = postModCreatedAt ?? allVersionMap.get(revertVersionId);

						return {
							msg: msgWithoutRevert,
							...(hasWorkflowUpdate && {
								versionCard: {
									id: `version-card-${id}`,
									role: 'assistant' as const,
									type: 'custom' as const,
									customType: 'version_card',
									data: {
										versionId: cardVersionId,
										...(cardCreatedAt && { createdAt: cardCreatedAt }),
									},
								},
							}),
						};
					}

					return { msg: uiMsg };
				});

				// Pass 2: build final list, placing each version card after the AI
				// response (just before the next user message, or at the end).
				// Title is left undefined — ChatVersionCard computes a "Version #N" fallback.
				const convertedMessages: ChatUI.AssistantMessage[] = [];
				let pendingVersionCard: ChatUI.AssistantMessage | null = null;

				for (const item of items) {
					// When we reach a new user message, flush the pending card.
					if (item.msg.role === 'user' && item.msg.type === 'text' && pendingVersionCard) {
						convertedMessages.push(pendingVersionCard);
						pendingVersionCard = null;
					}

					if (item.msg.type !== 'workflow-updated') {
						convertedMessages.push(item.msg);
					}

					if (item.versionCard) {
						pendingVersionCard = item.versionCard;
					}
				}

				// Flush the last pending version card (for the most recent generation)
				if (pendingVersionCard) {
					convertedMessages.push(pendingVersionCard);
				}

				// Restore pin data state if pin data is currently applied on the workflow
				const isPinDataEnabled =
					posthogStore.getVariant(CODE_WORKFLOW_BUILDER_EXPERIMENT.name) ===
					CODE_WORKFLOW_BUILDER_EXPERIMENT.codePinData;
				if (isPinDataEnabled) {
					const wfDocStore = workflowsStore.workflowId
						? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
						: undefined;
					const pinData = wfDocStore?.getPinDataSnapshot();
					if (pinData && Object.keys(pinData).length > 0) {
						generatedPinData.value = pinData;
						pinDataApplied.value = true;
					}
				}

				chatMessages.value = convertedMessages;

				// Restore collapse state from DB
				if (
					latestSession.activeVersionCardId &&
					convertedMessages.some((m) => m.id === latestSession.activeVersionCardId)
				) {
					activeVersionCardId.value = latestSession.activeVersionCardId;
				} else if (latestSession.activeVersionCardId) {
					console.warn(
						'[builder] activeVersionCardId not found in loaded messages — collapse state lost',
						latestSession.activeVersionCardId,
					);
				}
				if (
					latestSession.resumeAfterRestoreMessageId &&
					convertedMessages.some((m) => m.id === latestSession.resumeAfterRestoreMessageId)
				) {
					resumeAfterRestoreMessageId.value = latestSession.resumeAfterRestoreMessageId;
				}

				// Restore lastUserMessageId from the loaded session for telemetry tracking
				const lastUserMsg = [...convertedMessages]
					.reverse()
					.find((msg) => msg.role === 'user' && msg.type === 'text');
				if (lastUserMsg) {
					lastUserMessageId.value = lastUserMsg.id;
				}
			}

			return sessions;
		} catch (error) {
			console.error('Failed to load AI sessions:', error);
			return [];
		} finally {
			isLoadingSessions.value = false;
		}
	}

	function unpinAllNodes() {
		const pinData = workflowDocumentStore.value?.pinData;
		if (!pinData) return;
		for (const nodeName of Object.keys(pinData)) {
			workflowDocumentStore.value?.unpinNodeData(nodeName);
			if (workflowsStore.nodeMetadata[nodeName]) {
				workflowsStore.nodeMetadata[nodeName].pinnedDataLastRemovedAt = Date.now();
			}
		}
		uiStore.markStateDirty();
	}

	const hasGeneratedPinData = computed(
		() => generatedPinData.value !== null && Object.keys(generatedPinData.value).length > 0,
	);

	/** True when generated pin data exists but hasn't been applied yet */
	const hasDeferredPinData = computed(() => hasGeneratedPinData.value && !pinDataApplied.value);

	function storeGeneratedPinData(pinData: IPinData) {
		generatedPinData.value = {
			...(generatedPinData.value ?? {}),
			...pinData,
		};
	}

	function applyGeneratedPinData() {
		if (!generatedPinData.value || !workflowsStore.workflowId) return;
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		workflowDocumentStore.setPinData({
			...workflowDocumentStore.getPinDataSnapshot(),
			...generatedPinData.value,
		});
		uiStore.markStateDirty();
		pinDataApplied.value = true;
	}

	function clearExistingWorkflow() {
		workflowState.removeAllConnections({ setStateDirty: false });
		workflowDocumentStore.value?.removeAllNodes();
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

	/**
	 * Sets the AI Builder edits flag.
	 * Called by the useWorkflowUpdate composable when AI Builder makes changes.
	 */
	function setBuilderMadeEdits(value: boolean): void {
		aiBuilderMadeEdits.value = value;
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

	// Watch workflowId changes to reset chat and load sessions when workflow changes
	watch(
		() => workflowsStore.workflowId,
		(newWorkflowId, oldWorkflowId) => {
			if (newWorkflowId === oldWorkflowId) {
				return;
			}

			if (streaming.value) {
				abortStreaming();
			}

			resetBuilderChat();

			// Load sessions if AI builder is enabled and we're in a builder-enabled view
			// loadSessions has its own guards for workflow saved state and deduplication
			if (
				newWorkflowId &&
				route?.name &&
				BUILDER_ENABLED_VIEWS.includes(route.name as VIEWS) &&
				isAIBuilderEnabled.value
			) {
				void fetchBuilderCredits();
				void loadSessions();
			}
		},
	);

	// Set default builder mode based on canvas state once nodes are loaded.
	// Watches both workflowId and nodes.length so it fires when:
	// - A new workflow is opened (workflowId changes, even if nodes stay empty)
	// - Nodes are loaded after workflow reset (nodes.length changes)
	// Only applies when the chat is fresh (no messages) so it doesn't interfere
	// with an active conversation.
	watch(
		[() => workflowsStore.workflowId, () => (workflowDocumentStore.value?.allNodes ?? []).length],
		([, nodesCount]) => {
			if (chatMessages.value.length > 0) return;
			if (!isPlanModeAvailable.value) return;
			builderMode.value = nodesCount === 0 ? 'plan' : 'build';
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

	function trackWebFetchEvents(messages: ChatRequest.MessageResponse[]) {
		for (const msg of messages) {
			if (isWebFetchApprovalMessage(msg)) {
				trackWorkflowBuilderJourney('web_fetch_approval_prompted', {
					domain: msg.domain,
					url: msg.url,
				});
			}
			if (
				isApiToolMessage(msg) &&
				msg.toolName === 'web_fetch' &&
				(msg.status === 'completed' || msg.status === 'error')
			) {
				trackWorkflowBuilderJourney('web_fetch_completed', {
					status: msg.status,
				});
			}
		}
	}

	// Version management for workflow history
	const workflowHistoryStore = useWorkflowHistoryStore();

	/**
	 * Restores the workflow to a previous version and truncates chat messages.
	 * Restores the workflow to the given version and collapses messages after
	 * the version card (non-destructive — messages stay in DB and UI).
	 *
	 * @param versionId - The workflow version ID to restore to
	 * @param versionCardId - The version card message ID to truncate after
	 */
	async function restoreToVersion(
		versionId: string,
		versionCardId: string,
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
		workflowDocumentStore.value?.setUpdatedAt(updatedWorkflow.updatedAt);

		// 2. Find the next user message after the version card to truncate backend session
		const versionCardIndex = chatMessages.value.findIndex((msg) => msg.id === versionCardId);
		const nextUserMsg =
			versionCardIndex !== -1
				? chatMessages.value
						.slice(versionCardIndex + 1)
						.find((msg) => msg.role === 'user' && msg.type === 'text')
				: undefined;

		if (nextUserMsg?.id) {
			await truncateBuilderMessages(
				rootStore.restApiContext,
				workflowId,
				nextUserMsg.id,
				versionCardId,
				isCodeBuilder.value || undefined,
			);
		}

		// 3. Mark messages after the version card as collapsed (non-destructive)
		activeVersionCardId.value = versionCardId;
		resumeAfterRestoreMessageId.value = undefined;

		builderMode.value = 'build';

		// 4. Track telemetry event for version restore
		const messagesBeingReverted =
			versionCardIndex !== -1
				? chatMessages.value.slice(versionCardIndex + 1).filter((msg) => isVersionCardMessage(msg))
						.length
				: 0;
		trackWorkflowBuilderJourney('revert_version_from_builder', {
			revert_user_message_id: versionCardId,
			revert_version_id: versionId,
			no_versions_reverted: messagesBeingReverted,
		});

		return updatedWorkflow;
	}

	/**
	 * Clears the [Done] indicator from the page title and resets to IDLE.
	 * Should be called from a component that watches document visibility.
	 */
	function clearDoneIndicatorTitle() {
		if (documentTitle.getDocumentState() === 'AI_DONE') {
			documentTitle.setDocumentTitle(workflowsStore.workflowName, 'IDLE');
		}
	}

	// Public API
	return {
		// State
		chatMessages,
		streaming,
		isHelpStreaming,
		activeVersionCardId,
		resumeAfterRestoreMessageId,
		collapsedMessageIds,
		builderThinkingMessage,
		isAIBuilderEnabled,
		isCodeBuilder,
		builderMode,
		isPlanModeAvailable,
		isInterrupted,
		hasPendingPlan,
		shouldDisableChatInput,
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
		creditsPercentageRemaining,
		isLowCredits,
		hasMessages,
		latestRevertVersion,
		versionCardMessages,
		workflowTodos,
		hasTodosHiddenByPinnedData,
		hasHadSuccessfulExecution,
		hasDeferredPinData,
		hasGeneratedPinData,
		pinDataApplied,
		lastUserMessageId,
		wizardCurrentStep,
		wizardClearedPlaceholders,
		wizardHasExecutedWorkflow,

		// Methods
		unpinAllNodes,
		storeGeneratedPinData,
		applyGeneratedPinData,
		abortStreaming,
		resetBuilderChat,
		setBuilderMode,
		sendChatMessage,
		resumeWithQuestionsAnswers,
		resumeWithPlanDecision,
		loadSessions,
		getWorkflowSnapshot,
		fetchBuilderCredits,
		updateBuilderCredits,
		getRunningTools,
		trackWorkflowBuilderJourney,
		getAiBuilderMadeEdits,
		resetAiBuilderMadeEdits,
		setBuilderMadeEdits,
		incrementManualExecutionStats,
		resetManualExecutionStats,
		applyCodeDiff,
		undoCodeDiff,
		// Version management
		restoreToVersion,
		clearExistingWorkflow,
		// Session management
		clearBackendSession,
		// Title management for AI builder
		clearDoneIndicatorTitle,
	};
});
