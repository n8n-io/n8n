<script lang="ts" setup>
import { useBuilderStore } from '../../builder.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { useWorkflowAutosaveStore } from '@/app/stores/workflowAutosave.store';
import { AutoSaveState } from '@/app/constants';
import { computed, watch, ref, useSlots } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRoute, useRouter } from 'vue-router';
import type { RatingFeedback, WorkflowSuggestion } from '@n8n/design-system/types/assistant';
import { isTaskAbortedMessage, isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { nodeViewEventBus } from '@/app/event-bus';
import ExecuteMessage from './ExecuteMessage.vue';
import NotificationPermissionBanner from './NotificationPermissionBanner.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useBrowserNotifications } from '@/app/composables/useBrowserNotifications';
import { useToast } from '@/app/composables/useToast';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { WORKFLOW_SUGGESTIONS } from '@/app/constants/workflowSuggestions';
import { VIEWS } from '@/app/constants';
import { useWorkflowUpdate } from '@/app/composables/useWorkflowUpdate';
import { useErrorHandler } from '@/app/composables/useErrorHandler';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { jsonParse } from 'n8n-workflow';
import shuffle from 'lodash/shuffle';
import AISettingsButton from '@/features/ai/assistant/components/Chat/AISettingsButton.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';

import { N8nAskAssistantChat, N8nText } from '@n8n/design-system';

const emit = defineEmits<{
	close: [];
}>();

const builderStore = useBuilderStore();
const usersStore = useUsersStore();
const workflowHistoryStore = useWorkflowHistoryStore();
const historyStore = useHistoryStore();
const collaborationStore = useCollaborationStore();
const workflowAutosaveStore = useWorkflowAutosaveStore();
const telemetry = useTelemetry();
const slots = useSlots();
const workflowsStore = useWorkflowsStore();
const assistantStore = useAssistantStore();
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
	const builderUpdatedWorkflowMessageIndex = builderStore.chatMessages.findLastIndex(
		(msg) =>
			msg.type === 'workflow-updated' ||
			(msg.type === 'tool' && msg.toolName === 'update_node_parameters'),
	);

	// Check if there's an error message or task aborted message after the last workflow update
	const messagesAfterUpdate = builderStore.chatMessages.slice(
		builderUpdatedWorkflowMessageIndex + 1,
	);
	const hasErrorAfterUpdate = messagesAfterUpdate.some((msg) => msg.type === 'error');
	const hasTaskAbortedAfterUpdate = messagesAfterUpdate.some((msg) => isTaskAbortedMessage(msg));

	return (
		!builderStore.streaming &&
		workflowsStore.workflow.nodes.length > 0 &&
		builderUpdatedWorkflowMessageIndex > -1 &&
		!hasErrorAfterUpdate &&
		!hasTaskAbortedAfterUpdate
	);
});
const creditsQuota = computed(() => builderStore.creditsQuota);
const creditsRemaining = computed(() => builderStore.creditsRemaining);
const showAskOwnerTooltip = computed(() => !usersStore.isInstanceOwner);

const workflowSuggestions = computed<WorkflowSuggestion[] | undefined>(() => {
	// we don't show the suggestions if there are already messages
	return builderStore.hasMessages ? undefined : shuffle(WORKFLOW_SUGGESTIONS);
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

const disabledTooltip = computed(() => {
	if (!isInputDisabled.value) {
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

// Reset initial generation flag when streaming ends
// Note: Saving is handled by auto-save in NodeView.vue
watch(
	() => builderStore.streaming,
	(isStreaming, wasStreaming) => {
		// Only process when streaming just ended (was streaming, now not)
		if (!wasStreaming || isStreaming) {
			return;
		}

		if (builderStore.initialGeneration && workflowsStore.workflow.nodes.length > 0) {
			builderStore.initialGeneration = false;
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
		builderStore.clearExistingWorkflow();
		// Reload the workflow to reflect the restored state
		nodeViewEventBus.emit('importWorkflowData', {
			data: updatedWorkflow,
			tidyUp: false,
			regenerateIds: false,
			trackEvents: false,
			setStateDirty: false,
		});
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

defineExpose({
	focusInput: () => {
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
			:disabled="isInputDisabled"
			:disabled-tooltip="disabledTooltip"
			@close="emit('close')"
			@message="onUserMessage"
			@upgrade-click="() => goToUpgrade('ai-builder-sidebar', 'upgrade-builder')"
			@feedback="onFeedback"
			@stop="builderStore.abortStreaming"
			@restore-confirm="onRestoreConfirm"
			@show-version="onShowVersion"
		>
			<template #header>
				<div :class="{ [$style.header]: true, [$style['with-slot']]: !!slots.header }">
					<slot name="header" />
					<AISettingsButton
						v-if="showSettingsButton"
						:show-usability-notice="false"
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
				<N8nText :class="$style.topText"
					>{{ i18n.baseText('aiAssistant.builder.assistantPlaceholder') }}
				</N8nText>
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

.topText {
	color: var(--color--text);
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
