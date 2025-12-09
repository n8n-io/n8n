<script lang="ts" setup>
import { useBuilderStore } from '../../builder.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { computed, watch, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import type { RatingFeedback, WorkflowSuggestion } from '@n8n/design-system/types/assistant';
import { isTaskAbortedMessage, isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { nodeViewEventBus } from '@/app/event-bus';
import ExecuteMessage from './ExecuteMessage.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { WORKFLOW_SUGGESTIONS } from '@/app/constants/workflowSuggestions';
import shuffle from 'lodash/shuffle';

import { N8nAskAssistantChat, N8nText } from '@n8n/design-system';

const emit = defineEmits<{
	close: [];
}>();

const builderStore = useBuilderStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const workflowSaver = useWorkflowSaving({ router });
const { goToUpgrade } = usePageRedirectionHelper();

// Track processed workflow updates
const processedWorkflowUpdates = ref(new Set<string>());
const shouldTidyUp = ref(false);
const n8nChatRef = ref<InstanceType<typeof N8nAskAssistantChat>>();

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

async function onUserMessage(content: string) {
	const isNewWorkflow = workflowsStore.isNewWorkflow;

	// Save the workflow to get workflow ID which is used for session
	if (isNewWorkflow) {
		await workflowSaver.saveCurrentWorkflow();
	}

	// Reset tidy up flag for each new message exchange
	shouldTidyUp.value = false;

	// If the workflow is empty, set the initial generation flag
	const isInitialGeneration = workflowsStore.workflow.nodes.length === 0;

	builderStore.sendChatMessage({ text: content, initialGeneration: isInitialGeneration });
}

function onNewWorkflow() {
	builderStore.resetBuilderChat();
	processedWorkflowUpdates.value.clear();
	shouldTidyUp.value = false;
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
		});
	}
}

function onWorkflowExecuted() {
	const executionData = workflowsStore.workflowExecutionData;
	const executionStatus = executionData?.status ?? 'unknown';
	const errorNodeName = executionData?.data?.resultData.lastNodeExecuted;
	const errorNodeType = errorNodeName
		? workflowsStore.workflow.nodes.find((node) => node.name === errorNodeName)?.type
		: undefined;

	if (!executionData) {
		builderStore.sendChatMessage({
			text: i18n.baseText('aiAssistant.builder.executeMessage.noExecutionData'),
			type: 'execution',
			executionStatus: 'error',
			errorMessage: 'Workflow execution data missing after run attempt.',
		});
		return;
	}

	if (executionStatus === 'success') {
		builderStore.sendChatMessage({
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

	builderStore.sendChatMessage({
		text: scopedErrorMessage,
		type: 'execution',
		errorMessage: executionError,
		errorNodeType,
		executionStatus: failureStatus,
	});
}

// Watch for workflow updates and apply them
watch(
	() => builderStore.workflowMessages,
	(messages) => {
		messages
			.filter((msg) => {
				return msg.id && !processedWorkflowUpdates.value.has(msg.id);
			})
			.forEach((msg) => {
				if (msg.id && isWorkflowUpdatedMessage(msg)) {
					processedWorkflowUpdates.value.add(msg.id);

					const result = builderStore.applyWorkflowUpdate(msg.codeSnippet);

					if (result.success) {
						// Only tidy up if new nodes are added per user message
						const hasNewNodes = Boolean(result.newNodeIds && result.newNodeIds.length > 0);
						shouldTidyUp.value = shouldTidyUp.value || hasNewNodes;

						// Import the updated workflow
						nodeViewEventBus.emit('importWorkflowData', {
							data: result.workflowData,
							tidyUp: shouldTidyUp.value,
							nodesIdsToTidyUp: result.newNodeIds,
							regenerateIds: false,
							trackEvents: false,
						});
					}
				}
			});
	},
	{ deep: true },
);

// If this is the initial generation, streaming has ended, and there were workflow updates,
// we want to save the workflow
watch(
	() => builderStore.streaming,
	async (isStreaming) => {
		if (
			builderStore.initialGeneration &&
			!isStreaming &&
			workflowsStore.workflow.nodes.length > 0
		) {
			// Check if the generation completed successfully (no error or cancellation)
			const lastMessage = builderStore.chatMessages[builderStore.chatMessages.length - 1];
			const successful =
				lastMessage && lastMessage.type !== 'error' && !isTaskAbortedMessage(lastMessage);

			builderStore.initialGeneration = false;

			// Only save if generation completed successfully
			if (successful) {
				await workflowSaver.saveCurrentWorkflow();
			}
		}
	},
);

// Reset on route change
watch(currentRoute, () => {
	onNewWorkflow();
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
			@close="emit('close')"
			@message="onUserMessage"
			@upgrade-click="() => goToUpgrade('ai-builder-sidebar', 'upgrade-builder')"
			@feedback="onFeedback"
			@stop="builderStore.abortStreaming"
		>
			<template #header>
				<slot name="header" />
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

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
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
