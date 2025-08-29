<script lang="ts" setup>
import { useBuilderStore } from '@/stores/builder.store';
import { useUsersStore } from '@/stores/users.store';
import { computed, watch, ref, nextTick } from 'vue';
import AskAssistantChat from '@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import type { ChatUI, RatingFeedback } from '@n8n/design-system/types/assistant';
import { isWorkflowUpdatedMessage } from '@n8n/design-system/types/assistant';
import { nodeViewEventBus } from '@/event-bus';
import type { NodesPlanMessageType } from './NodesPlanMessage.vue';
import NodesPlanMessage from './NodesPlanMessage.vue';
import { PLAN_APPROVAL_MESSAGE } from '@/constants';

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

// Track processed workflow updates
const processedWorkflowUpdates = ref(new Set<string>());
const trackedTools = ref(new Set<string>());
const planStatus = ref<'pending' | 'approved' | 'rejected'>();
const assistantChatRef = ref<InstanceType<typeof AskAssistantChat> | null>(null);

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const loadingMessage = computed(() => builderStore.assistantThinkingMessage);
const currentRoute = computed(() => route.name);

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

function isNodesPlanMessage(message: ChatUI.AssistantMessage): message is NodesPlanMessageType {
	return (
		message.type === 'custom' && message.customType === 'nodesPlan' && Array.isArray(message.data)
	);
}

function onApprovePlan() {
	planStatus.value = 'approved';

	telemetry.track('User clicked Approve plan', {
		session_id: builderStore.trackingSessionId,
	});

	void onUserMessage(PLAN_APPROVAL_MESSAGE);
}

function onRequestChanges() {
	planStatus.value = 'rejected';

	telemetry.track('User clicked Request changes', {
		session_id: builderStore.trackingSessionId,
	});

	// Focus the input after rejecting the plan
	void nextTick(() => {
		assistantChatRef.value?.focusInput();
	});
}

function shouldShowPlanControls(message: NodesPlanMessageType) {
	const planMessageIndex = builderStore.chatMessages.findIndex((msg) => msg.id === message.id);
	return planMessageIndex === builderStore.chatMessages.length - 1;
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

					const currentWorkflowJson = builderStore.getWorkflowSnapshot();
					const result = builderStore.applyWorkflowUpdate(msg.codeSnippet);

					if (result.success) {
						// Import the updated workflow
						nodeViewEventBus.emit('importWorkflowData', {
							data: result.workflowData,
							tidyUp: true,
							nodesIdsToTidyUp: result.newNodeIds,
							regenerateIds: false,
						});

						// Track tool usage for telemetry
						const newToolMessages = builderStore.toolMessages.filter(
							(toolMsg) =>
								toolMsg.status !== 'running' &&
								toolMsg.toolCallId &&
								!trackedTools.value.has(toolMsg.toolCallId),
						);

						newToolMessages.forEach((toolMsg) => trackedTools.value.add(toolMsg.toolCallId ?? ''));

						telemetry.track('Workflow modified by builder', {
							tools_called: newToolMessages.map((toolMsg) => toolMsg.toolName),
							session_id: builderStore.trackingSessionId,
							start_workflow_json: currentWorkflowJson,
							end_workflow_json: msg.codeSnippet,
							workflow_id: workflowsStore.workflowId,
						});
					}
				}
			});

		// Check if last message is a plan message and if so, whether to show controls
		const lastMessage = builderStore.chatMessages[builderStore.chatMessages.length - 1];
		if (lastMessage && isNodesPlanMessage(lastMessage)) {
			planStatus.value = 'pending';
		}
	},
	{ deep: true },
);

// If this is the initial generation, streaming has ended, and there were workflow updates,
// we want to save the workflow
watch(
	() => builderStore.streaming,
	async () => {
		if (
			builderStore.initialGeneration &&
			!builderStore.streaming &&
			workflowsStore.workflow.nodes.length > 0
		) {
			// Check if the generation completed successfully (no error or cancellation)
			const lastMessage = builderStore.chatMessages[builderStore.chatMessages.length - 1];
			const successful =
				lastMessage &&
				lastMessage.type !== 'error' &&
				!(lastMessage.type === 'text' && lastMessage.content === '[Task aborted]');

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
</script>

<template>
	<div data-test-id="ask-assistant-chat" tabindex="0" :class="$style.container" @keydown.stop>
		<AskAssistantChat
			ref="assistantChatRef"
			:user="user"
			:messages="builderStore.chatMessages"
			:streaming="builderStore.streaming"
			:disabled="planStatus === 'pending'"
			:loading-message="loadingMessage"
			:mode="i18n.baseText('aiAssistant.builder.mode')"
			:title="'n8n AI'"
			:show-stop="true"
			:scroll-on-new-message="true"
			:placeholder="i18n.baseText('aiAssistant.builder.placeholder')"
			:max-length="1000"
			@close="emit('close')"
			@message="onUserMessage"
			@feedback="onFeedback"
			@stop="builderStore.stopStreaming"
		>
			<template #header>
				<slot name="header" />
			</template>
			<template #custom-message="{ message, ...props }">
				<NodesPlanMessage
					v-if="message.customType === 'nodesPlan' && isNodesPlanMessage(message)"
					:message="message"
					:show-controls="shouldShowPlanControls(message)"
					v-bind="props"
					@approve-plan="onApprovePlan"
					@request-changes="onRequestChanges"
				/>
			</template>
			<template #placeholder>
				<n8n-text :class="$style.topText">{{
					i18n.baseText('aiAssistant.builder.placeholder')
				}}</n8n-text>
			</template>
		</AskAssistantChat>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
}

.topText {
	color: var(--color-text-base);
}

.newWorkflowButtonWrapper {
	display: flex;
	flex-direction: column;
	flex-flow: wrap;
	gap: var(--spacing-2xs);
	background-color: var(--color-background-light);
	padding: var(--spacing-xs);
	border: 0;
}
.newWorkflowText {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}
</style>
