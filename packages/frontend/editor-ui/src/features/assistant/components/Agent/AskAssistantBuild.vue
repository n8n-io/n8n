<script lang="ts" setup>
import { useBuilderStore } from '../../builder.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, watch, ref } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import type { RatingFeedback } from '@n8n/design-system/types/assistant';
import { isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { nodeViewEventBus } from '@/event-bus';
import ExecuteMessage from './ExecuteMessage.vue';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { WORKFLOW_SUGGESTIONS } from '@/constants/workflowSuggestions';
import type { WorkflowSuggestion } from '@n8n/design-system/types/assistant';

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
const trackedTools = ref(new Set<string>());
const workflowUpdated = ref<{ start: string; end: string } | undefined>();
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

	return builderStore.assistantThinkingMessage;
});
const currentRoute = computed(() => route.name);
const showExecuteMessage = computed(() => {
	const builderUpdatedWorkflowMessageIndex = builderStore.chatMessages.findLastIndex(
		(msg) => msg.type === 'workflow-updated',
	);
	return (
		!builderStore.streaming &&
		workflowsStore.workflow.nodes.length > 0 &&
		builderUpdatedWorkflowMessageIndex > -1
	);
});
const creditsQuota = computed(() => builderStore.creditsQuota);
const creditsRemaining = computed(() => builderStore.creditsRemaining);
const showAskOwnerTooltip = computed(() => !usersStore.isInstanceOwner);

const workflowSuggestions = computed<WorkflowSuggestion[] | undefined>(() => {
	// Only show suggestions when no messages in chat yet (blank state)
	if (builderStore.chatMessages.length === 0) {
		return WORKFLOW_SUGGESTIONS;
	}
	return undefined;
});

async function onUserMessage(content: string) {
	const isNewWorkflow = workflowsStore.isNewWorkflow;

	// Save the workflow to get workflow ID which is used for session
	if (isNewWorkflow) {
		await workflowSaver.saveCurrentWorkflow();
	}

	// If the workflow is empty, set the initial generation flag
	const isInitialGeneration = workflowsStore.workflow.nodes.length === 0;

	builderStore.sendChatMessage({ text: content, initialGeneration: isInitialGeneration });
}

function onNewWorkflow() {
	builderStore.resetBuilderChat();
	processedWorkflowUpdates.value.clear();
	trackedTools.value.clear();
	workflowUpdated.value = undefined;
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

function dedupeToolNames(toolNames: string[]): string[] {
	return [...new Set(toolNames)];
}

function trackWorkflowModifications() {
	if (workflowUpdated.value) {
		// Track tool usage for telemetry
		const newToolMessages = builderStore.toolMessages.filter(
			(toolMsg) =>
				toolMsg.status !== 'running' &&
				toolMsg.toolCallId &&
				!trackedTools.value.has(toolMsg.toolCallId),
		);

		newToolMessages.forEach((toolMsg) => trackedTools.value.add(toolMsg.toolCallId ?? ''));
		telemetry.track('Workflow modified by builder', {
			tools_called: dedupeToolNames(newToolMessages.map((toolMsg) => toolMsg.toolName)),
			session_id: builderStore.trackingSessionId,
			start_workflow_json: workflowUpdated.value.start,
			end_workflow_json: workflowUpdated.value.end,
			workflow_id: workflowsStore.workflowId,
		});

		workflowUpdated.value = undefined;
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

					const originalWorkflowJson =
						workflowUpdated.value?.start ?? builderStore.getWorkflowSnapshot();
					const result = builderStore.applyWorkflowUpdate(msg.codeSnippet);

					if (result.success) {
						// Import the updated workflow
						nodeViewEventBus.emit('importWorkflowData', {
							data: result.workflowData,
							tidyUp: true,
							nodesIdsToTidyUp: result.newNodeIds,
							regenerateIds: false,
							trackEvents: false,
						});

						workflowUpdated.value = {
							start: originalWorkflowJson,
							end: msg.codeSnippet,
						};
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
		if (!isStreaming) {
			trackWorkflowModifications();
		}

		if (
			builderStore.initialGeneration &&
			!isStreaming &&
			workflowsStore.workflow.nodes.length > 0
		) {
			// Check if the generation completed successfully (no error or cancellation)
			const lastMessage = builderStore.chatMessages[builderStore.chatMessages.length - 1];
			const successful =
				lastMessage &&
				lastMessage.type !== 'error' &&
				!(
					lastMessage.type === 'text' &&
					lastMessage.content === i18n.baseText('aiAssistant.builder.streamAbortedMessage')
				);

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
			@stop="builderStore.stopStreaming"
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
