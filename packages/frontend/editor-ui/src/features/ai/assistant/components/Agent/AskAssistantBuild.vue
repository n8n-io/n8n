<script lang="ts" setup>
import { useBuilderStore } from '../../builder.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useWorkflowSaveStore } from '@/app/stores/workflowSave.store';
import { AutoSaveState } from '@/app/constants';
import { computed, watch, ref, nextTick, useSlots } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRoute, useRouter } from 'vue-router';
import type { RatingFeedback, WorkflowSuggestion } from '@n8n/design-system/types/assistant';
import { isTaskAbortedMessage, isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { nodeViewEventBus } from '@/app/event-bus';
import ExecuteMessage from './ExecuteMessage.vue';
import NotificationPermissionBanner from './NotificationPermissionBanner.vue';
import ChatInputWithMention from '../FocusedNodes/ChatInputWithMention.vue';
import MessageFocusedNodesChips from '../FocusedNodes/MessageFocusedNodesChips.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useBrowserNotifications } from '@/app/composables/useBrowserNotifications';
import { useToast } from '@/app/composables/useToast';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { WORKFLOW_SUGGESTIONS } from '@/app/constants/workflowSuggestions';
import { VIEWS } from '@/app/constants';
import { useWorkflowUpdate } from '@/app/composables/useWorkflowUpdate';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useErrorHandler } from '@/app/composables/useErrorHandler';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { jsonParse } from 'n8n-workflow';
import shuffle from 'lodash/shuffle';
import AISettingsButton from '@/features/ai/assistant/components/Chat/AISettingsButton.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useChatPanelStateStore } from '@/features/ai/assistant/chatPanelState.store';

import { N8nAskAssistantChat } from '@n8n/design-system';
import BuildModeEmptyState from './BuildModeEmptyState.vue';
import {
	isPlanModePlanMessage,
	isPlanModeQuestionsMessage,
	isPlanModeUserAnswersMessage,
	type PlanMode,
} from '../../assistant.types';
import PlanDisplayMessage from './PlanDisplayMessage.vue';
import PlanModeSelector from './PlanModeSelector.vue';
import PlanQuestionsMessage from './PlanQuestionsMessage.vue';
import UserAnswersMessage from './UserAnswersMessage.vue';

const emit = defineEmits<{
	close: [];
}>();

const builderStore = useBuilderStore();
const usersStore = useUsersStore();
const workflowHistoryStore = useWorkflowHistoryStore();
const historyStore = useHistoryStore();
const collaborationStore = useCollaborationStore();
const workflowAutosaveStore = useWorkflowSaveStore();
const settingsStore = useSettingsStore();
const telemetry = useTelemetry();
const slots = useSlots();
const workflowsStore = useWorkflowsStore();
const assistantStore = useAssistantStore();
const chatPanelStateStore = useChatPanelStateStore();
const router = useRouter();
const i18n = useI18n();
const route = useRoute();
const { goToUpgrade } = usePageRedirectionHelper();
const toast = useToast();
const { updateWorkflow } = useWorkflowUpdate();
const { handleError } = useErrorHandler({
	source: 'ai-builder',
	titleKey: 'aiAssistant.builder.error.title',
});
const { onDocumentVisible } = useDocumentVisibility();
const { canPrompt } = useBrowserNotifications();

onDocumentVisible(() => {
	builderStore.clearDoneIndicatorTitle();
});

// Track processed workflow updates and accumulated node IDs for tidyUp
const processedWorkflowUpdates = ref(new Set<string>());
const accumulatedNodeIdsToTidyUp = ref<string[]>([]);
const n8nChatRef = ref<InstanceType<typeof N8nAskAssistantChat>>();
const chatInputRef = ref<InstanceType<typeof ChatInputWithMention>>();
const suggestionsInputRef = ref<InstanceType<typeof ChatInputWithMention>>();
const inputText = ref('');

const notificationsPermissionsBannerTriggered = ref(false);

watch(
	() => builderStore.streaming,
	(isStreaming) => {
		if (isStreaming && canPrompt.value) {
			notificationsPermissionsBannerTriggered.value = true;
		}
	},
);

const showSettingsButton = computed(() => {
	return assistantStore.canManageAISettings;
});

const allowSendingParameterValues = computed(
	() => settingsStore.settings.ai.allowSendingParameterValues,
);

const shouldShowNotificationBanner = computed(() => {
	return notificationsPermissionsBannerTriggered.value && canPrompt.value;
});

watch(shouldShowNotificationBanner, (isShown) => {
	if (isShown) {
		builderStore.trackWorkflowBuilderJourney('browser_notification_ask_permission');
	}
});

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const loadingMessage = computed(() => {
	// Check if we have any running tool messages visible in the chat
	const hasVisibleRunningTools = builderStore.getRunningTools(builderStore.chatMessages).length > 0;
	// Don't show loading message if tools are already visible and running
	// to avoid duplicate display (tool messages show their own status)
	if (hasVisibleRunningTools) {
		return undefined;
	}

	return builderStore.builderThinkingMessage;
});
const currentRoute = computed(() => route.name);
const showExecuteMessage = computed(() => {
	const messages = builderStore.chatMessages;
	const builderUpdatedWorkflowMessageIndex = messages.findLastIndex(
		(msg) =>
			msg.type === 'workflow-updated' ||
			(msg.type === 'tool' && msg.toolName === 'update_node_parameters'),
	);

	// Check if there's an error message or task aborted message after the last workflow update
	const messagesAfterUpdate = messages.slice(builderUpdatedWorkflowMessageIndex + 1);
	const hasErrorAfterUpdate = messagesAfterUpdate.some((msg) => msg.type === 'error');
	const hasTaskAbortedAfterUpdate = messagesAfterUpdate.some((msg) => isTaskAbortedMessage(msg));

	// Hide when the last assistant message is a question or plan awaiting user action
	const lastAssistantMessage = messages.findLast((msg) => msg.role === 'assistant');
	const hasPendingInteraction =
		lastAssistantMessage &&
		(isPlanModeQuestionsMessage(lastAssistantMessage) ||
			isPlanModePlanMessage(lastAssistantMessage));

	return (
		!builderStore.streaming &&
		workflowsStore.workflow.nodes.length > 0 &&
		builderUpdatedWorkflowMessageIndex > -1 &&
		!hasErrorAfterUpdate &&
		!hasTaskAbortedAfterUpdate &&
		!hasPendingInteraction
	);
});
const creditsQuota = computed(() => builderStore.creditsQuota);
const creditsRemaining = computed(() => builderStore.creditsRemaining);
const showAskOwnerTooltip = computed(() => !usersStore.isInstanceOwner);

// Use different completion message for code-builder
const thinkingCompletionMessage = computed(() =>
	builderStore.isCodeBuilder
		? i18n.baseText('aiAssistant.builder.thinkingCompletionMessage.codeBuilder')
		: undefined,
);

const workflowSuggestions = computed<WorkflowSuggestion[] | undefined>(() => {
	if (builderStore.hasMessages || workflowsStore.workflow.nodes.length > 0) {
		return undefined;
	}
	return shuffle(WORKFLOW_SUGGESTIONS);
});

const isAutosaving = computed(() => {
	return (
		workflowAutosaveStore.autoSaveState === AutoSaveState.Scheduled ||
		workflowAutosaveStore.autoSaveState === AutoSaveState.InProgress
	);
});

const isInputDisabled = computed(() => {
	return collaborationStore.shouldBeReadOnly || isAutosaving.value;
});

const isChatInputDisabled = computed(() => {
	return isInputDisabled.value || builderStore.shouldDisableChatInput;
});

const disabledTooltip = computed(() => {
	if (!isChatInputDisabled.value) {
		return undefined;
	}
	if (isAutosaving.value) {
		return i18n.baseText('aiAssistant.builder.disabledTooltip.autosaving');
	}
	if (collaborationStore.shouldBeReadOnly) {
		return i18n.baseText('aiAssistant.builder.disabledTooltip.readOnly');
	}
	return undefined;
});

/**
 * Check if questions have been answered (there's a user_answers message after this questions message)
 */
function isQuestionsAnswered(questionsMessage: { id?: string }): boolean {
	const messages = builderStore.chatMessages;
	const questionsIndex = messages.findIndex((m) => m.id === questionsMessage.id);
	if (questionsIndex === -1) return false;

	for (let i = questionsIndex + 1; i < messages.length; i++) {
		if (isPlanModeUserAnswersMessage(messages[i])) {
			return true;
		}
	}
	return false;
}

/**
 * Check if this plan message is the last one and nothing has been sent after it.
 * Only the latest plan with no subsequent messages should show the "Implement" button,
 * because the HITL interrupt only works for the pending plan.
 */
function isLastPlanMessage(message: PlanMode.PlanMessage): boolean {
	const messages = builderStore.chatMessages;
	const idx = messages.findLastIndex((m) => m.id === message.id);
	if (idx === -1) return false;
	// Check that no user message or other content exists after this plan
	return !messages.slice(idx + 1).some((m) => m.role === 'user');
}

async function onUserMessage(content: string) {
	// Record activity to maintain write lock while building
	collaborationStore.requestWriteAccess();

	// Reset accumulated node IDs for each new message exchange
	accumulatedNodeIdsToTidyUp.value = [];

	// If the workflow is empty, set the initial generation flag
	const isInitialGeneration = workflowsStore.workflow.nodes.length === 0;

	await builderStore.sendChatMessage({
		text: content,
		initialGeneration: isInitialGeneration,
	});
}

async function onCustomInputSubmit() {
	if (!inputText.value.trim()) return;
	const content = inputText.value;
	inputText.value = '';
	await onUserMessage(content);
}

function onNewWorkflow() {
	builderStore.resetBuilderChat();
	processedWorkflowUpdates.value.clear();
	accumulatedNodeIdsToTidyUp.value = [];
	notificationsPermissionsBannerTriggered.value = false;
}

function onFeedback(feedback: RatingFeedback) {
	if (feedback.rating) {
		telemetry.track('User rated workflow generation', {
			helpful: feedback.rating === 'up',
			workflow_id: workflowsStore.workflowId,
			session_id: builderStore.trackingSessionId,
		});
	}
	if (feedback.feedback) {
		telemetry.track('User submitted workflow generation feedback', {
			feedback: feedback.feedback,
			workflow_id: workflowsStore.workflowId,
			session_id: builderStore.trackingSessionId,
			user_message_id: builderStore.lastUserMessageId,
		});
	}
}

async function onWorkflowExecuted() {
	const executionData = workflowsStore.workflowExecutionData;
	const executionStatus = executionData?.status ?? 'unknown';
	const errorNodeName = executionData?.data?.resultData.lastNodeExecuted;
	const errorNodeType = errorNodeName
		? workflowsStore.workflow.nodes.find((node) => node.name === errorNodeName)?.type
		: undefined;

	if (!executionData) {
		await builderStore.sendChatMessage({
			text: i18n.baseText('aiAssistant.builder.executeMessage.noExecutionData'),
			type: 'execution',
			executionStatus: 'error',
			errorMessage: 'Workflow execution data missing after run attempt.',
		});
		return;
	}

	if (executionStatus === 'success') {
		await builderStore.sendChatMessage({
			text: i18n.baseText('aiAssistant.builder.executeMessage.executionSuccess'),
			type: 'execution',
			executionStatus,
		});
		return;
	}

	const executionError = executionData.data?.resultData.error?.message ?? 'Unknown error';
	const scopedErrorMessage = errorNodeName
		? i18n.baseText('aiAssistant.builder.executeMessage.executionFailedOnNode', {
				interpolate: {
					nodeName: errorNodeName,
					errorMessage: executionError,
				},
			})
		: i18n.baseText('aiAssistant.builder.executeMessage.executionFailed', {
				interpolate: { errorMessage: executionError },
			});

	const failureStatus = executionStatus === 'unknown' ? 'error' : executionStatus;

	await builderStore.sendChatMessage({
		text: scopedErrorMessage,
		type: 'execution',
		errorMessage: executionError,
		errorNodeType,
		executionStatus: failureStatus,
	});
}

function parseWorkflowJson(workflowJson: string): WorkflowDataUpdate | undefined {
	try {
		return jsonParse<WorkflowDataUpdate>(workflowJson);
	} catch (error) {
		handleError(error, {
			context: 'workflow-json-parse',
			title: i18n.baseText('aiAssistant.builder.workflowParsingError.title'),
			message: i18n.baseText('aiAssistant.builder.workflowParsingError.content'),
		});
		return undefined;
	}
}

// Watch for workflow updates and apply them
watch(
	() => builderStore.workflowMessages,
	async (messages) => {
		for (const msg of messages) {
			if (!msg.id || processedWorkflowUpdates.value.has(msg.id)) continue;
			if (!isWorkflowUpdatedMessage(msg)) continue;

			processedWorkflowUpdates.value.add(msg.id);

			const workflowData = parseWorkflowJson(msg.codeSnippet);
			if (!workflowData) continue;

			const result = await updateWorkflow(workflowData, {
				isInitialGeneration: builderStore.initialGeneration,
				nodeIdsToTidyUp: accumulatedNodeIdsToTidyUp.value,
			});

			if (!result.success) {
				handleError(result.error, { context: 'workflow-update' });
				builderStore.abortStreaming();
				return;
			}

			// Accumulate new node IDs so subsequent messages tidy up all new nodes
			if (result.newNodeIds.length > 0) {
				accumulatedNodeIdsToTidyUp.value = [
					...accumulatedNodeIdsToTidyUp.value,
					...result.newNodeIds,
				];
			}
		}
	},
	{ deep: true },
);

// Manage undo recording based on streaming state - start when streaming begins, stop when it ends
// This ensures all builder changes during a streaming session can be undone at once
watch(
	() => builderStore.streaming,
	(isStreaming, wasStreaming) => {
		if (isStreaming && !wasStreaming) {
			historyStore.startRecordingUndo();
		} else if (!isStreaming && wasStreaming) {
			historyStore.stopRecordingUndo();
		}
	},
);

// Reset initial generation flag and fit canvas when streaming ends
// Note: Saving is handled by auto-save in NodeView.vue
watch(
	() => builderStore.streaming,
	async (isStreaming, wasStreaming) => {
		// Only process when streaming just ended (was streaming, now not)
		if (!wasStreaming || isStreaming) {
			return;
		}

		if (builderStore.initialGeneration && workflowsStore.workflow.nodes.length > 0) {
			builderStore.initialGeneration = false;
		}

		// Zoom to fit all nodes after generation completes
		if (accumulatedNodeIdsToTidyUp.value.length > 0) {
			await nextTick();
			canvasEventBus.emit('fitView');
		}
	},
);

/**
 * Handle restore confirmation
 */
async function onRestoreConfirm(versionId: string, messageId: string) {
	try {
		const updatedWorkflow = await builderStore.restoreToVersion(versionId, messageId);
		if (!updatedWorkflow) {
			return;
		}

		processedWorkflowUpdates.value.clear();
		accumulatedNodeIdsToTidyUp.value = [];

		builderStore.clearExistingWorkflow();
		// Reload the workflow to reflect the restored state
		nodeViewEventBus.emit('importWorkflowData', {
			data: updatedWorkflow,
			tidyUp: false,
			regenerateIds: false,
			trackEvents: false,
			setStateDirty: false,
		});

		await nextTick();
		builderStore.builderMode = 'build';
	} catch (e: unknown) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('aiAssistant.builder.restoreError.title'),
			message: e instanceof Error ? e.message : 'Unknown error',
		});
	}
}

/**
 * Handle "Show version" click - opens workflow history in a new tab
 */
function onShowVersion(versionId: string) {
	const route = router.resolve({
		name: VIEWS.WORKFLOW_HISTORY,
		params: {
			workflowId: workflowsStore.workflowId,
			versionId,
		},
	});
	window.open(route.href, '_blank');
}

// Reset on route change, but not if streaming is in progress
watch(currentRoute, () => {
	if (!builderStore.streaming) {
		onNewWorkflow();
	}
});

// Refocus chat input when a canvas node is clicked while chat is open
watch(
	() => chatPanelStateStore.focusRequested,
	() => {
		void nextTick(() => {
			suggestionsInputRef.value?.focusInput() ??
				chatInputRef.value?.focusInput() ??
				n8nChatRef.value?.focusInput();
		});
	},
);

defineExpose({
	focusInput: () => {
		suggestionsInputRef.value?.focusInput() ??
			chatInputRef.value?.focusInput() ??
			n8nChatRef.value?.focusInput();
	},
});
</script>

<template>
	<div data-test-id="ask-assistant-chat" tabindex="0" :class="$style.container" @keydown.stop>
		<N8nAskAssistantChat
			ref="n8nChatRef"
			:user="user"
			:messages="builderStore.chatMessages"
			:streaming="builderStore.streaming"
			:loading-message="loadingMessage"
			:thinking-completion-message="thinkingCompletionMessage"
			:mode="i18n.baseText('aiAssistant.builder.mode')"
			:show-stop="true"
			:scroll-on-new-message="true"
			:credits-quota="creditsQuota"
			:credits-remaining="creditsRemaining"
			:show-ask-owner-tooltip="showAskOwnerTooltip"
			:suggestions="workflowSuggestions"
			:input-placeholder="i18n.baseText('aiAssistant.builder.assistantPlaceholder')"
			:workflow-id="workflowsStore.workflowId"
			:prune-time-hours="workflowHistoryStore.evaluatedPruneTime"
			:disabled="isChatInputDisabled"
			:disabled-tooltip="disabledTooltip"
			@close="emit('close')"
			@message="onUserMessage"
			@upgrade-click="() => goToUpgrade('ai-builder-sidebar', 'upgrade-builder')"
			@feedback="onFeedback"
			@stop="builderStore.abortStreaming"
			@restore-confirm="onRestoreConfirm"
			@show-version="onShowVersion"
		>
			<template #focused-nodes-chips="{ message }">
				<MessageFocusedNodesChips :focused-node-names="message.focusedNodeNames" />
			</template>
			<template #header>
				<div :class="{ [$style.header]: true, [$style['with-slot']]: !!slots.header }">
					<slot name="header" />
					<AISettingsButton
						v-if="showSettingsButton"
						:show-usability-notice="!allowSendingParameterValues"
						:disabled="builderStore.streaming"
					/>
				</div>
			</template>
			<template #inputHeader>
				<Transition name="slide">
					<NotificationPermissionBanner v-if="shouldShowNotificationBanner" />
				</Transition>
			</template>
			<template #messagesFooter>
				<ExecuteMessage v-if="showExecuteMessage" @workflow-executed="onWorkflowExecuted" />
			</template>
			<template #placeholder>
				<BuildModeEmptyState />
			</template>
			<template #custom-message="{ message }">
				<!-- Always render questions message; when answered, collapse to intro text only -->
				<PlanQuestionsMessage
					v-if="isPlanModeQuestionsMessage(message)"
					:questions="message.data.questions"
					:intro-message="message.data.introMessage"
					:disabled="builderStore.streaming"
					:answered="isQuestionsAnswered(message)"
					@submit="builderStore.resumeWithQuestionsAnswers"
				/>
				<PlanDisplayMessage
					v-else-if="isPlanModePlanMessage(message)"
					:message="message"
					:disabled="builderStore.streaming"
					:show-actions="isLastPlanMessage(message)"
					@decision="builderStore.resumeWithPlanDecision"
				/>
				<UserAnswersMessage
					v-else-if="isPlanModeUserAnswersMessage(message)"
					:answers="message.data.answers"
				/>
			</template>
			<template
				#suggestions-input="{
					modelValue,
					onUpdateModelValue,
					placeholder,
					disabled: slotDisabled,
					disabledTooltip: slotDisabledTooltip,
					streaming: slotStreaming,
					creditsQuota: slotCreditsQuota,
					creditsRemaining: slotCreditsRemaining,
					showAskOwnerTooltip: slotShowAskOwnerTooltip,
					onSubmit,
					onStop,
					onUpgradeClick,
					registerFocus,
				}"
			>
				<ChatInputWithMention
					ref="suggestionsInputRef"
					:model-value="modelValue"
					:placeholder="placeholder"
					:disabled="slotDisabled"
					:disabled-tooltip="slotDisabledTooltip"
					:streaming="slotStreaming"
					:credits-quota="slotCreditsQuota"
					:credits-remaining="slotCreditsRemaining"
					:show-ask-owner-tooltip="slotShowAskOwnerTooltip"
					@update:model-value="onUpdateModelValue"
					@submit="onSubmit"
					@stop="onStop"
					@upgrade-click="onUpgradeClick"
					@vue:mounted="registerFocus(() => suggestionsInputRef?.focusInput())"
				>
					<template v-if="builderStore.isPlanModeAvailable" #extra-actions>
						<PlanModeSelector
							:model-value="builderStore.builderMode"
							@update:model-value="builderStore.setBuilderMode"
						/>
					</template>
				</ChatInputWithMention>
			</template>
			<template #inputPlaceholder>
				<ChatInputWithMention
					ref="chatInputRef"
					v-model="inputText"
					:placeholder="i18n.baseText('aiAssistant.builder.assistantPlaceholder')"
					:disabled="isInputDisabled"
					:disabled-tooltip="disabledTooltip"
					:streaming="builderStore.streaming"
					:credits-quota="creditsQuota"
					:credits-remaining="creditsRemaining"
					:show-ask-owner-tooltip="showAskOwnerTooltip"
					@submit="onCustomInputSubmit"
					@stop="builderStore.abortStreaming"
					@upgrade-click="() => goToUpgrade('ai-builder-sidebar', 'upgrade-builder')"
				>
					<template v-if="builderStore.isPlanModeAvailable" #extra-actions>
						<PlanModeSelector
							:model-value="builderStore.builderMode"
							@update:model-value="builderStore.setBuilderMode"
						/>
					</template>
				</ChatInputWithMention>
			</template>
		</N8nAskAssistantChat>
	</div>
</template>

<style lang="scss" scoped>
.slide-enter-active,
.slide-leave-active {
	transition: transform var(--animation--duration) var(--animation--easing);
}

.slide-enter-from,
.slide-leave-to {
	transform: translateY(8px);
}
</style>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
}

.header {
	display: flex;
	justify-content: end;
	align-items: center;
	flex: 1;

	&.with-slot {
		justify-content: space-between;
	}
}

.newWorkflowButtonWrapper {
	display: flex;
	flex-direction: column;
	flex-flow: wrap;
	gap: var(--spacing--2xs);
	background-color: var(--color--background--light-2);
	padding: var(--spacing--xs);
	border: 0;
}

.newWorkflowText {
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}
</style>
